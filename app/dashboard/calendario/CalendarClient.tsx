"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import type { TaskPriority, TaskStatus } from "@prisma/client"
import { Button } from "@/components/shadcn/ui/button"
import { Card, CardContent } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"
import TaskModal from "@/components/TaskModal"
import type { CurrentUser, TaskWithRelations, UserLite } from "@/components/tasks/task-types"
import { fetchJsonOrThrow } from "@/lib/fetch-json"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Play, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react"
import { cn } from "@/lib/ui"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

const DAYS_OF_WEEK = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export default function CalendarClient({
  initialTasks,
  users,
  currentUser
}: {
  initialTasks: TaskWithRelations[]
  users: UserLite[]
  currentUser: CurrentUser
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null)
  const [modalMode, setModalMode] = useState<"create" | "detail">("detail")
  const [modalOpen, setModalOpen] = useState(false)
  const [createDate, setCreateDate] = useState<string | null>(null)

  // Current calendar month view state
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Generate calendar grid (42 cells: 6 rows of 7 days)
  const calendarCells = useMemo(() => {
    const startOfMonth = new Date(year, month, 1)
    const endOfMonth = new Date(year, month + 1, 0)
    const startDayOfWeek = startOfMonth.getDay() // 0 = Sun, 1 = Mon, etc.
    const totalDays = endOfMonth.getDate()

    const cells: Array<{ day: number; isCurrentMonth: boolean; date: Date; dateStr: string }> = []

    // 1. Padding from previous month
    const prevMonthEnd = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDay = prevMonthEnd - i
      const d = new Date(year, month - 1, prevDay)
      cells.push({
        day: prevDay,
        isCurrentMonth: false,
        date: d,
        dateStr: d.toISOString().slice(0, 10)
      })
    }

    // 2. Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i)
      cells.push({
        day: i,
        isCurrentMonth: true,
        date: d,
        dateStr: d.toISOString().slice(0, 10)
      })
    }

    // 3. Padding from next month
    const remaining = 42 - cells.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      cells.push({
        day: i,
        isCurrentMonth: false,
        date: d,
        dateStr: d.toISOString().slice(0, 10)
      })
    }

    return cells
  }, [year, month])

  // Group tasks by their due date yyyy-mm-dd
  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskWithRelations[]> = {}
    tasks.forEach((t) => {
      if (!t.dueDate) return
      const dStr = new Date(t.dueDate).toISOString().slice(0, 10)
      if (!map[dStr]) {
        map[dStr] = []
      }
      map[dStr].push(t)
    })
    return map
  }, [tasks])

  // Month navigation helpers
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const setToday = () => setCurrentDate(new Date())

  // Task API Action handlers (replicated from KanbanBoard for full updates support)
  async function handleUpdateTask(id: string, patch: any) {
    const data = await fetchJsonOrThrow<{ task?: TaskWithRelations }>(
      `/api/tasks/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      },
      { defaultError: "No se pudo actualizar la tarea", logTag: "PATCH /api/tasks/:id" }
    )
    setTasks((prev) => prev.map((t) => (t.id === id ? (data.task as TaskWithRelations) : t)))
    setActiveTask((prev) => (prev?.id === id ? (data.task as TaskWithRelations) : prev))
    toast.success("Tarea actualizada")
  }

  async function handleCreateTask(input: {
    title: string
    description: string | null
    assignedUserIds: string[]
    priority: TaskPriority
    dueDate: string | null
  }) {
    const data = await fetchJsonOrThrow<{ task?: TaskWithRelations }>(
      "/api/tasks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      },
      { defaultError: "No se pudo crear la tarea", logTag: "POST /api/tasks" }
    )
    setTasks((prev) => [data.task as TaskWithRelations, ...prev])
    setModalOpen(false)
    toast.success("Tarea creada exitosamente")
  }

  async function handleDeleteTask(id: string) {
    await fetchJsonOrThrow<{ ok?: boolean }>(
      `/api/tasks/${id}`,
      { method: "DELETE" },
      { defaultError: "No se pudo eliminar la tarea", logTag: "DELETE /api/tasks/:id" }
    )
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setModalOpen(false)
    toast.success("Tarea eliminada")
  }

  async function handleAddComment(taskId: string, content: string) {
    const data = await fetchJsonOrThrow<{ comment?: any }>(
      "/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, content })
      },
      { defaultError: "No se pudo comentar", logTag: "POST /api/comments" }
    )
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, comments: [...t.comments, data.comment] } : t)))
    setActiveTask((prev) => (prev?.id === taskId ? { ...prev, comments: [...prev.comments, data.comment] } : prev))
  }

  async function handleAddAttachment(taskId: string, formData: FormData) {
    const data = await fetchJsonOrThrow<{ attachment?: any; attachments?: any[] }>(
      `/api/tasks/${taskId}/attachments`,
      { method: "POST", body: formData },
      { defaultError: "No se pudo adjuntar archivo", logTag: "POST /api/tasks/:id/attachments" }
    )
    const attachments = Array.isArray(data.attachments)
      ? data.attachments
      : data.attachment
        ? [...(tasks.find((t) => t.id === taskId)?.attachments || []), data.attachment]
        : []
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, attachments } : t)))
    setActiveTask((prev) => (prev?.id === taskId ? { ...prev, attachments } : prev))
  }

  async function handleDeleteAttachment(taskId: string, attachmentId: string) {
    await fetchJsonOrThrow<{ ok?: boolean }>(
      `/api/tasks/${taskId}/attachments/${attachmentId}`,
      { method: "DELETE" },
      { defaultError: "No se pudo eliminar archivo", logTag: "DELETE /api/tasks/:id/attachments/:attachmentId" }
    )
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, attachments: (t.attachments || []).filter((a) => a.id !== attachmentId) } : t)))
    setActiveTask((prev) => (prev?.id === taskId ? { ...prev, attachments: (prev.attachments || []).filter((a) => a.id !== attachmentId) } : prev))
  }

  const openCreateModal = (dateStr: string) => {
    if (currentUser.role !== "ADMIN") return
    setCreateDate(dateStr)
    setModalMode("create")
    setModalOpen(true)
  }

  const openDetailModal = (task: TaskWithRelations) => {
    setActiveTask(task)
    setModalMode("detail")
    setModalOpen(true)
  }

  // Priority Dot styles
  const priorityColor = (priority: TaskPriority) => {
    if (priority === "HIGH") return "bg-[#EF4444]"
    if (priority === "MEDIUM") return "bg-[#F59E0B]"
    return "bg-[#3F9EA2]"
  }

  return (
    <div className="space-y-6">
      
      {/* Calendar Header Control Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA] flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#016B6B]" />
            <span>Calendario de Planificación</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Visualización mensual del cronograma de entregas de tareas
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-white dark:bg-[#1C1D1D] rounded-xl border border-slate-200/60 dark:border-slate-800/60 p-1.5 shadow-sm">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 px-0 rounded-lg text-slate-500 hover:text-slate-700" 
            onClick={prevMonth}
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </Button>

          <span className="text-xs font-poppins font-black text-slate-800 dark:text-slate-100 min-w-[110px] text-center uppercase tracking-wider">
            {MONTHS[month]} {year}
          </span>

          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 px-0 rounded-lg text-slate-500 hover:text-slate-700" 
            onClick={nextMonth}
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs font-bold font-poppins px-3 rounded-lg border-slate-200 hover:bg-slate-50 dark:border-slate-800"
            onClick={setToday}
          >
            Hoy
          </Button>
        </div>
      </div>

      {/* Calendar Grid Sheet */}
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#1C1D1D] shadow-sm overflow-hidden">
        
        {/* Days of week titles */}
        <div className="grid grid-cols-7 border-b border-slate-250/20 bg-slate-50/50 dark:bg-slate-900/10 text-center py-2.5">
          {DAYS_OF_WEEK.map((day) => (
            <span key={day} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-poppins">
              {day}
            </span>
          ))}
        </div>

        {/* Date cells grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/40 border-l border-t-0 border-slate-100 dark:border-slate-800/40">
          {calendarCells.map((cell, idx) => {
            const isToday = new Date().toDateString() === cell.date.toDateString()
            const dayTasks = tasksByDate[cell.dateStr] || []

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[105px] p-1.5 flex flex-col justify-between group transition-colors duration-150 relative",
                  cell.isCurrentMonth 
                    ? "bg-white dark:bg-[#1C1D1D] text-slate-800 dark:text-slate-100" 
                    : "bg-slate-50/40 text-slate-350 dark:bg-[#1C1D1D]/20 dark:text-slate-600",
                  isToday && "bg-[#016B6B]/5 dark:bg-[#3F9EA2]/5"
                )}
              >
                
                {/* Date Label & Add Button */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs font-bold rounded-full w-5.5 h-5.5 flex items-center justify-center font-poppins",
                    isToday ? "bg-[#016B6B] text-white" : "text-slate-500 dark:text-slate-400"
                  )}>
                    {cell.day}
                  </span>
                  
                  {currentUser.role === "ADMIN" && cell.isCurrentMonth && (
                    <button 
                      onClick={() => openCreateModal(cell.dateStr)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-100 text-[#016B6B] dark:hover:bg-slate-800 dark:text-[#3F9EA2] transition-all absolute right-2 top-2"
                      title="Nueva tarea para este día"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Day Tasks List */}
                <div className="mt-1.5 space-y-1 overflow-y-auto max-h-[70px] pr-0.5 flex-1 custom-scrollbar">
                  {dayTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openDetailModal(t)}
                      className={cn(
                        "w-full text-left px-1.5 py-0.5 text-[10px] font-bold rounded border truncate flex items-center gap-1 transition-all hover:scale-[1.02]",
                        t.status === "DONE" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-450 dark:border-emerald-900/30 line-through" 
                          : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                      )}
                      title={`${t.title} (${t.priority})`}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", priorityColor(t.priority))} />
                      <span className="truncate">{t.title}</span>
                    </button>
                  ))}
                </div>

              </div>
            )
          })}
        </div>

      </div>

      {/* Task Modal Integration */}
      <TaskModal
        open={modalOpen}
        mode={modalMode}
        task={modalMode === "detail" ? activeTask ?? undefined : undefined}
        users={users}
        currentUser={currentUser}
        onClose={() => setModalOpen(false)}
        onCreate={modalMode === "create" ? handleCreateTask : undefined}
        onUpdate={modalMode === "detail" && activeTask ? (id, patch) => handleUpdateTask(id, patch) : undefined}
        onDelete={modalMode === "detail" && activeTask ? (id) => handleDeleteTask(id) : undefined}
        onAddComment={modalMode === "detail" ? handleAddComment : undefined}
        onAddAttachment={modalMode === "detail" ? handleAddAttachment : undefined}
        onDeleteAttachment={modalMode === "detail" ? handleDeleteAttachment : undefined}
      />
    </div>
  )
}
