"use client"

import { useEffect, useMemo, useState } from "react"
import type { TaskPriority, TaskStatus } from "@prisma/client"
import type { CurrentUser, TaskWithRelations, UserLite } from "@/components/tasks/task-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Button } from "@/components/shadcn/ui/button"
import { Input } from "@/components/shadcn/ui/input"
import { Badge } from "@/components/shadcn/ui/badge"
import { Select as ShadcnSelect } from "@/components/shadcn/ui/select"
import { MultiSelect } from "@/components/ui/MultiSelect"
import { Plus, CheckSquare, Calendar, AlertCircle } from "lucide-react"
import { cn } from "@/lib/ui"

function isoDateOnly(d: string | Date | null) {
  if (!d) return ""
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function parseTags(input: string) {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10)
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const label = status === "PENDING" ? "Pendiente" : status === "IN_PROGRESS" ? "En progreso" : "Completada"
  
  const statusStyles = {
    PENDING: "bg-[#3F9EA2]/10 text-[#3F9EA2] dark:bg-[#3F9EA2]/5",
    IN_PROGRESS: "bg-[#016B6B]/10 text-[#016B6B] dark:bg-[#3F9EA2]/5 dark:text-[#3F9EA2]",
    DONE: "bg-[#22C55E]/10 text-[#22C55E] dark:bg-[#22C55E]/5"
  }

  return (
    <Badge className={cn("text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border-0 shadow-none", statusStyles[status])}>
      {label}
    </Badge>
  )
}

export default function TaskListView({
  tasks,
  users,
  currentUser,
  onCreate,
  onUpdate
}: {
  tasks: TaskWithRelations[]
  users: UserLite[]
  currentUser: CurrentUser
  onCreate: (input: {
    title: string
    description: string | null
    assignedUserIds: string[]
    priority: TaskPriority
    dueDate: string | null
    tags?: string[]
  }) => Promise<void>
  onUpdate: (
    id: string,
    patch: Partial<{
      title: string
      description: string | null
      status: TaskStatus
      priority: TaskPriority
      assignedUserIds: string[]
      dueDate: string | null
      tags: string[]
    }>
  ) => Promise<void>
}) {
  const canAdmin = currentUser.role === "ADMIN"

  const defaultAssigneeIds = useMemo(() => {
    const found = users.find((u) => u.id === currentUser.id)?.id
    return found ? [found] : []
  }, [currentUser.id, users])

  const [newTitle, setNewTitle] = useState("")
  const [creating, setCreating] = useState(false)

  async function createInline() {
    const title = newTitle.trim()
    if (!title || creating) return
    setCreating(true)
    try {
      await onCreate({
        title,
        description: null,
        assignedUserIds: defaultAssigneeIds,
        priority: "MEDIUM",
        dueDate: null
      })
      setNewTitle("")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#1C1D1D] rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="pb-3.5 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-poppins font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <CheckSquare className="h-4.5 w-4.5 text-[#016B6B] dark:text-[#3F9EA2]" />
            <span>Lista de tareas</span>
          </CardTitle>
          
          {canAdmin ? (
            <div className="flex items-center gap-2 flex-1 max-w-lg justify-end">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void createInline()
                  }
                }}
                placeholder="Añadir una tarea rápida a la lista..."
                className="h-9 text-xs rounded-xl"
              />
              <Button 
                size="sm" 
                className="h-9 bg-[#016B6B] text-white hover:bg-[#3F9EA2] active:scale-[0.98] transition-all rounded-xl px-4 font-bold text-xs shadow-sm shadow-[#016B6B]/10 border-0 flex items-center gap-1 shrink-0" 
                onClick={() => void createInline()} 
                disabled={!newTitle.trim() || creating}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{creating ? "Creando" : "Crear"}</span>
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} users={users} currentUser={currentUser} canAdmin={canAdmin} onUpdate={onUpdate} />
          ))}
          {tasks.length === 0 ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
              No hay tareas registradas en esta vista.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function TaskRow({
  task,
  users,
  currentUser,
  canAdmin,
  onUpdate
}: {
  task: TaskWithRelations
  users: UserLite[]
  currentUser: CurrentUser
  canAdmin: boolean
  onUpdate: (
    id: string,
    patch: Partial<{
      title: string
      description: string | null
      status: TaskStatus
      priority: TaskPriority
      assignedUserIds: string[]
      dueDate: string | null
      tags: string[]
    }>
  ) => Promise<void>
}) {
  const canEditStatus = canAdmin || task.assignedUsers.some((u) => u.id === currentUser.id)
  const canEditFields = canAdmin

  const [title, setTitle] = useState(task.title)
  const [dueDate, setDueDate] = useState(isoDateOnly(task.dueDate))
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [assignedUserIds, setAssignedUserIds] = useState(task.assignedUsers.map((u) => u.id))
 const [tags, setTags] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => setTitle(task.title), [task.title])
  useEffect(() => setDueDate(isoDateOnly(task.dueDate)), [task.dueDate])
  useEffect(() => setPriority(task.priority), [task.priority])
  useEffect(() => setAssignedUserIds(task.assignedUsers.map((u) => u.id)), [task.assignedUsers])
  useEffect(() => setTags(""), [])

  async function save(patch: Parameters<typeof onUpdate>[1]) {
    if (saving) return
    setSaving(true)
    try {
      await onUpdate(task.id, patch)
    } finally {
      setSaving(false)
    }
  }

  const isDone = task.status === "DONE"
  
  const dueTime = task.dueDate ? new Date(task.dueDate).getTime() : null
  const isOverdue = Boolean(dueTime && task.status !== "DONE" && dueTime < Date.now())

  // Priority Styles mapping
  const priorityStyles = {
    HIGH: "bg-rose-50 text-[#EF4444] border-rose-100 dark:bg-rose-950/20 dark:text-rose-450",
    MEDIUM: "bg-amber-50 text-[#F59E0B] border-amber-100 dark:bg-amber-950/20 dark:text-amber-450",
    LOW: "bg-[#3F9EA2]/10 text-[#3F9EA2] border-[#3F9EA2]/20 dark:bg-[#3F9EA2]/5"
  }

  const priorityLabel = {
    HIGH: "Alta",
    MEDIUM: "Media",
    LOW: "Baja"
  }[task.priority]

  return (
    <div className="grid grid-cols-1 gap-3 p-3.5 sm:p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center hover:bg-slate-50/30 dark:hover:bg-[#121313]/10 transition-colors duration-150">
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <input
            aria-label="Completar tarea"
            type="checkbox"
            className="mt-2.5 h-4.5 w-4.5 rounded-lg border-slate-350 dark:border-slate-700 text-[#016B6B] focus:ring-[#016B6B] accent-[#016B6B] cursor-pointer"
            checked={isDone}
            disabled={!canEditStatus || saving}
            onChange={(e) => void save({ status: e.target.checked ? "DONE" : "PENDING" })}
          />

          <div className="min-w-0 flex-1 space-y-2">
            
            {/* Title Row with Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  const trimmed = title.trim()
                  if (!canEditFields) return
                  if (trimmed && trimmed !== task.title) void save({ title: trimmed })
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                disabled={!canEditFields || saving}
                className={cn(
                  "h-8 border-transparent bg-transparent text-xs font-bold font-poppins px-1.5 focus-visible:border-slate-200 dark:focus-visible:border-slate-800 focus-visible:bg-white dark:focus-visible:bg-slate-950/40 rounded-lg flex-1 min-w-[200px] shadow-none",
                  isDone ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-850 dark:text-slate-100"
                )}
              />
              <StatusBadge status={task.status} />
              
              <Badge className={cn("text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border-0 shadow-none", priorityStyles[task.priority])}>
                {priorityLabel}
              </Badge>

              {task.dueDate ? (
                <Badge variant="outline" className={cn("shrink-0 text-[10px] font-semibold border-slate-200/80 dark:border-slate-800", isOverdue && "text-rose-500 border-rose-200 bg-rose-50/20")}>
                  {isOverdue ? "Atrasada: " : "Vence: "}{isoDateOnly(task.dueDate)}
                </Badge>
              ) : null}

            </div>

            {/* Quick inputs editor inside Row */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Modificar Plazo</span>
                </div>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onBlur={() => {
                    if (!canEditFields) return
                    const next = dueDate ? dueDate : null
                    const prev = isoDateOnly(task.dueDate) || null
                    if (next !== prev) void save({ dueDate: next })
                  }}
                  disabled={!canEditFields || saving}
                  className="h-8.5 text-xs rounded-xl"
                />
              </div>

              <div className="min-w-0 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridad</div>
                <ShadcnSelect
                  value={priority}
                  onChange={(e) => {
                    const next = e.target.value as TaskPriority
                    setPriority(next)
                    if (canEditFields) void save({ priority: next })
                  }}
                  disabled={!canEditFields || saving}
                  className="h-8.5 text-xs rounded-xl"
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                </ShadcnSelect>
              </div>

              <div className="min-w-0 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  <span>Asignados</span>
                </div>
                <MultiSelect
                  options={users}
                  selected={assignedUserIds}
                  onChange={(next) => {
                    setAssignedUserIds(next)
                    if (canEditFields) void save({ assignedUserIds: next })
                  }}
                />
              </div>

              
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        {saving ? (
          <span className="text-[10px] font-bold text-[#016B6B] animate-pulse flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Guardando...
          </span>
        ) : null}
      </div>
    </div>
  )
}
