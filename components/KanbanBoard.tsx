"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import type { TaskPriority, TaskStatus } from "@prisma/client"
import { Button } from "@/components/shadcn/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"
import { Label } from "@/components/shadcn/ui/label"
import { Select as ShadcnSelect } from "@/components/shadcn/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/shadcn/ui/dialog"
import TaskCard from "@/components/TaskCard"
import TaskModal from "@/components/TaskModal"
import CreateTaskDialog from "@/components/CreateTaskDialog"
import CreateUserDialog from "@/components/CreateUserDialog"
import ViewSelector, { type TasksViewMode } from "@/components/tasks/ViewSelector"
import TaskListView from "@/components/tasks/TaskListView"
import TaskTableView from "@/components/tasks/TaskTableView"
import TaskTimelineView from "@/components/tasks/TaskTimelineView"
import type { CurrentUser, TaskWithRelations, UserLite } from "@/components/tasks/task-types"
import { fetchJsonOrThrow } from "@/lib/fetch-json"
import { 
  Clock, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  UserPlus, 
  Plus,
  Trash2
} from "lucide-react"

const columns: Array<{ key: TaskStatus; title: string }> = [
  { key: "PENDING", title: "Pendiente" },
  { key: "IN_PROGRESS", title: "En progreso" },
  { key: "DONE", title: "Completada" }
]

function getCurrentTimestamp() {
  return new Date().getTime()
}

function isTransientTasksError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes("P1017") ||
    message.includes("ConnectionReset") ||
    message.includes("Server has closed the connection") ||
    message.includes("Failed to fetch") ||
    message.includes("503")
  )
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function SkeletonTaskCard() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-1 h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 flex items-center justify-between">
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function KanbanBoard({
  currentUser,
  users,
  initialTasks,
  forceUserId,
  pageTitle,
  dashboardMode,
  emptyState
}: {
  currentUser: CurrentUser
  users: UserLite[]
  initialTasks: TaskWithRelations[]
  forceUserId?: string
  pageTitle?: string
  dashboardMode?: "default" | "userDaily"
  emptyState?: { title: string; description?: string }
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks)
  const [filterUserId, setFilterUserId] = useState<string>(forceUserId ?? "all")
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all")
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all")
  const [view, setView] = useState<TasksViewMode>("kanban")
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [trashSelectionStatus, setTrashSelectionStatus] = useState<TaskStatus | null>(null)
  const [selectedTrashTaskIds, setSelectedTrashTaskIds] = useState<string[]>([])
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false)
  const [trashSubmitting, setTrashSubmitting] = useState(false)
  const refreshAbortRef = useRef<AbortController | null>(null)
  const isInitialLoading = refreshing && tasks.length === 0

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterUserId !== "all" && !t.assignedUsers.some((u) => u.id === filterUserId)) return false
      if (filterStatus !== "all" && t.status !== filterStatus) return false
      if (filterPriority !== "all" && t.priority !== filterPriority) return false
      return true
    })
  }, [tasks, filterUserId, filterStatus, filterPriority])

  const statsBase = useMemo(() => {
    return currentUser.role === "ADMIN" ? filteredTasks : filteredTasks.filter((t) => t.assignedUsers.some((u) => u.id === currentUser.id))
  }, [filteredTasks, currentUser.id, currentUser.role])

  const pendingCount = useMemo(() => statsBase.filter((t) => t.status === "PENDING").length, [statsBase])
  const inProgressCount = useMemo(() => statsBase.filter((t) => t.status === "IN_PROGRESS").length, [statsBase])
  const doneCount = useMemo(() => statsBase.filter((t) => t.status === "DONE").length, [statsBase])

  const overdueCount = useMemo(() => {
    const now = getCurrentTimestamp()
    return statsBase.filter((t) => {
      if (!t.dueDate) return false
      const d = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate)
      const time = d.getTime()
      if (Number.isNaN(time)) return false
      return t.status !== "DONE" && time < now
    }).length
  }, [statsBase])

  const visibleColumns = useMemo(() => {
    if (filterStatus === "all") return columns
    return columns.filter((c) => c.key === filterStatus)
  }, [filterStatus])

  const viewStorageKey = useMemo(() => {
    const scope = forceUserId ? "mine" : "all"
    return `tasks:view:${scope}`
  }, [forceUserId])

  useEffect(() => {
    try {
      window.localStorage.setItem(viewStorageKey, view)
    } catch {
      // ignore
    }
  }, [view, viewStorageKey])

  const refresh = useCallback(async () => {
    refreshAbortRef.current?.abort()
    const controller = new AbortController()
    refreshAbortRef.current = controller

    setRefreshing(true)

    try {
      let attempt = 0

      while (true) {
        try {
          const data = await fetchJsonOrThrow<{ tasks?: TaskWithRelations[] }>(
            "/api/tasks",
            { cache: "no-store", signal: controller.signal },
            { defaultError: "No se pudo cargar", logTag: "GET /api/tasks" }
          )

          if (!controller.signal.aborted) {
            setTasks(data.tasks ?? [])
          }
          break
        } catch (error) {
          if (controller.signal.aborted) return
          if (attempt >= 1 || !isTransientTasksError(error)) {
            throw error
          }
          attempt += 1
          await delay(400 * attempt)
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        toast.error(error instanceof Error ? error.message : "Error")
      }
    } finally {
      if (refreshAbortRef.current === controller) {
        refreshAbortRef.current = null
      }
      if (!controller.signal.aborted) {
        setRefreshing(false)
      }
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    if (dashboardMode === "userDaily") {
      refreshAbortRef.current?.abort()
      router.refresh()
      return
    }

    await refresh()
  }, [dashboardMode, refresh, router])

  useEffect(() => {
    return () => {
      refreshAbortRef.current?.abort()
    }
  }, [])

  const priorityRank: Record<TaskPriority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }

  function dueTime(dueDate: TaskWithRelations["dueDate"]) {
    if (!dueDate) return null
    const d = dueDate instanceof Date ? dueDate : new Date(dueDate)
    const t = d.getTime()
    return Number.isNaN(t) ? null : t
  }

  function tasksByStatus(status: TaskStatus) {
    const now = getCurrentTimestamp()

    return filteredTasks
      .filter((t) => t.status === status)
      .slice()
      .sort((a, b) => {
        const aDue = dueTime(a.dueDate)
        const bDue = dueTime(b.dueDate)

        const aOverdue = aDue !== null && a.status !== "DONE" && aDue < now
        const bOverdue = bDue !== null && b.status !== "DONE" && bDue < now
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1

        const aHasDue = aDue !== null
        const bHasDue = bDue !== null
        if (aHasDue !== bHasDue) return aHasDue ? -1 : 1

        if (aDue !== null && bDue !== null && aDue !== bDue) return aDue - bDue

        const aPriority = priorityRank[a.priority] ?? 0
        const bPriority = priorityRank[b.priority] ?? 0
        if (aPriority !== bPriority) return bPriority - aPriority

        const aCreated = new Date(a.createdAt).getTime()
        const bCreated = new Date(b.createdAt).getTime()
        if (!Number.isNaN(aCreated) && !Number.isNaN(bCreated) && aCreated !== bCreated) return bCreated - aCreated

        return a.title.localeCompare(b.title)
      })
  }

  const selectedTrashTaskSet = useMemo(() => new Set(selectedTrashTaskIds), [selectedTrashTaskIds])
  const selectedTrashCount = selectedTrashTaskIds.length

  function startTrashSelection(status: TaskStatus) {
    setTrashSelectionStatus(status)
    setSelectedTrashTaskIds([])
    setTrashConfirmOpen(false)
  }

  function cancelTrashSelection() {
    setTrashSelectionStatus(null)
    setSelectedTrashTaskIds([])
    setTrashConfirmOpen(false)
  }

  function toggleTrashSelection(taskId: string, checked: boolean) {
    setSelectedTrashTaskIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(taskId)
      else next.delete(taskId)
      return Array.from(next)
    })
  }

  async function submitTrashSelection() {
    if (!trashSelectionStatus || selectedTrashTaskIds.length === 0 || trashSubmitting) return

    setTrashSubmitting(true)
    try {
      await fetchJsonOrThrow<{ ok?: boolean }>(
        "/api/tasks/trash",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskIds: selectedTrashTaskIds,
            columnId: trashSelectionStatus
          })
        },
        { defaultError: "No se pudo enviar a la papelera", logTag: "POST /api/tasks/trash" }
      )
      setTasks((prev) => prev.filter((task) => !selectedTrashTaskIds.includes(task.id)))
      setActiveTask((prev) => (prev && selectedTrashTaskIds.includes(prev.id) ? null : prev))
      toast.success(selectedTrashTaskIds.length === 1 ? "Tarea enviada a la papelera" : "Tareas enviadas a la papelera")
      cancelTrashSelection()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally {
      setTrashSubmitting(false)
    }
  }
  async function updateTask(
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
  ) {
    const data = await fetchJsonOrThrow<{ task?: TaskWithRelations }>(
      `/api/tasks/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      },
      { defaultError: "No se pudo actualizar", logTag: "PATCH /api/tasks/:id" }
    )
    setTasks((prev) => prev.map((t) => (t.id === id ? (data.task as TaskWithRelations) : t)))
    setActiveTask((prev) => (prev?.id === id ? (data.task as TaskWithRelations) : prev))
  }

  async function createTask(input: {
    title: string
    description: string | null
    assignedUserIds: string[]
    priority: TaskPriority
    dueDate: string | null
    tags?: string[]
  }) {
    const data = await fetchJsonOrThrow<{ task?: TaskWithRelations }>(
      "/api/tasks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      },
      { defaultError: "No se pudo crear", logTag: "POST /api/tasks" }
    )
    setTasks((prev) => [data.task as TaskWithRelations, ...prev])
  }

  async function deleteTask(id: string) {
    await fetchJsonOrThrow<{ ok?: boolean }>(`/api/tasks/${id}`, { method: "DELETE" }, { defaultError: "No se pudo eliminar", logTag: "DELETE /api/tasks/:id" })
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setActiveTask((prev) => (prev?.id === id ? null : prev))
  }

  async function addComment(taskId: string, content: string) {
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

  async function addAttachment(taskId: string, formData: FormData) {
    const data = await fetchJsonOrThrow<{ attachment?: any; attachments?: any[] }>(
      `/api/tasks/${taskId}/attachments`,
      {
        method: "POST",
        body: formData
      },
      { defaultError: "No se pudo adjuntar", logTag: "POST /api/tasks/:id/attachments" }
    )
    const attachments = Array.isArray(data.attachments)
      ? data.attachments
      : data.attachment
        ? [...(tasks.find((t) => t.id === taskId)?.attachments || []), data.attachment]
        : []
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, attachments } : t)))
    setActiveTask((prev) => (prev?.id === taskId ? { ...prev, attachments } : prev))
  }

  async function deleteAttachment(taskId: string, attachmentId: string) {
    await fetchJsonOrThrow<{ ok?: boolean }>(
      `/api/tasks/${taskId}/attachments/${attachmentId}`,
      { method: "DELETE" },
      { defaultError: "No se pudo eliminar adjunto", logTag: "DELETE /api/tasks/:id/attachments/:attachmentId" }
    )
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, attachments: (t.attachments || []).filter((a) => a.id !== attachmentId) } : t)))
    setActiveTask((prev) => (prev?.id === taskId ? { ...prev, attachments: (prev.attachments || []).filter((a) => a.id !== attachmentId) } : prev))
  }

  return (
    <div className="space-y-6">
      
      {/* KPI Cards Row */}
      {dashboardMode !== "userDaily" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Pendientes */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft dark:border-slate-800/60 dark:bg-[#1C1D1D] transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-poppins uppercase tracking-wider">
                Tareas Pendientes
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3F9EA2]/10 text-[#3F9EA2]">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
                {pendingCount}
              </span>
              <span className="text-xs text-slate-400">asignadas</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#3F9EA2]" />
          </div>

          {/* En Progreso */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft dark:border-slate-800/60 dark:bg-[#1C1D1D] transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-poppins uppercase tracking-wider">
                En Progreso
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#016B6B]/10 text-[#016B6B] dark:text-[#3F9EA2] dark:bg-[#3F9EA2]/10">
                <Play className="h-5 w-5 fill-current" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
                {inProgressCount}
              </span>
              <span className="text-xs text-slate-400">en desarrollo</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#016B6B]" />
          </div>

          {/* Completadas */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft dark:border-slate-800/60 dark:bg-[#1C1D1D] transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-poppins uppercase tracking-wider">
                Completadas
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#22C55E]/10 text-[#22C55E]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
                {doneCount}
              </span>
              <span className="text-xs text-slate-400">finalizadas</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#22C55E]" />
          </div>

          {/* Vencidas */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft dark:border-slate-800/60 dark:bg-[#1C1D1D] transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-poppins uppercase tracking-wider">
                Vencidas / Alertas
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-[#EF4444] dark:bg-rose-950/20">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
                {overdueCount}
              </span>
              <span className="text-xs text-rose-500 font-semibold">fuera de plazo</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#EF4444]" />
          </div>

        </div>
      ) : null}

      <div className="space-y-3">
        
        {/* Header Title & Mode */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
              {pageTitle || "Tablero de Tareas"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {dashboardMode === "userDaily" ? "Tus responsabilidades para el día de hoy" : "Organización y control de carga laboral"}
            </p>
          </div>
          
          {dashboardMode !== "userDaily" ? (
            <ViewSelector value={view} onChange={setView} />
          ) : null}
        </div>

        {/* Filters Card */}
        <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#1C1D1D] shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
              {!forceUserId ? (
                <div className="space-y-1.5">
                  <Label htmlFor="filter-user" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Responsable</Label>
                  <ShadcnSelect id="filter-user" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} className="h-9.5">
                    <option value="all">Todos los miembros</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </ShadcnSelect>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="filter-status" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Estado</Label>
                <ShadcnSelect id="filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="h-9.5">
                  <option value="all">Todos los estados</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="IN_PROGRESS">En progreso</option>
                  <option value="DONE">Completada</option>
                </ShadcnSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-priority" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Prioridad</Label>
                <ShadcnSelect id="filter-priority" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as any)} className="h-9.5">
                  <option value="all">Todas las prioridades</option>
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                </ShadcnSelect>
              </div>

              {/* Actions row */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button 
                  variant="outline" 
                  onClick={() => void handleRefresh()} 
                  disabled={refreshing} 
                  className="h-9.5 w-full border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-300 font-poppins font-normal text-xs flex items-center justify-center gap-1.5 rounded-xl"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? "Refrescando" : "Refrescar"}</span>
                </Button>
                
                {currentUser.role === "ADMIN" ? (
                  <Button 
                    variant="outline" 
                    onClick={() => setCreateUserOpen(true)} 
                    className="h-9.5 w-full border-[#016B6B]/20 text-[#016B6B] hover:bg-[#016B6B]/5 dark:border-[#3F9EA2]/20 dark:text-[#3F9EA2] dark:hover:bg-[#3F9EA2]/5 font-poppins font-normal text-xs flex items-center justify-center gap-1.5 rounded-xl"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Miembro</span>
                  </Button>
                ) : null}
                {currentUser.role === "ADMIN" ? (
                  <Button 
                    onClick={() => setCreateOpen(true)} 
                    className="h-9.5 w-full bg-[#016B6B] text-white hover:bg-[#3F9EA2] active:scale-[0.98] font-poppins font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#016B6B]/10 rounded-xl sm:col-span-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nueva tarea</span>
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isInitialLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SkeletonTaskCard />
          <SkeletonTaskCard />
          <SkeletonTaskCard />
        </div>
      ) : null}

      {!isInitialLoading && tasks.length === 0 && emptyState ? (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
          <CardHeader>
            <CardTitle className="text-base">{emptyState.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {emptyState.description ? <p className="text-sm text-slate-600 dark:text-slate-400">{emptyState.description}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {!isInitialLoading && tasks.length === 0 && !emptyState ? (
        <Card className="border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-[#1C1D1D]">
          <CardContent className="flex min-h-[180px] items-center justify-center p-8 text-center">
            <p className="font-poppins text-sm font-medium text-slate-500 dark:text-slate-400">
              No hay tareas disponibles
            </p>
          </CardContent>
        </Card>
      ) : null}

       

      {view === "kanban" ? (
        <div
          className={[
            "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 touch-pan-x scroll-px-4 scroll-smooth",
            "md:mx-0 md:snap-none md:px-0 md:pb-4 md:touch-auto md:scroll-px-0 w-full"
          ].join(" ")}
        >
          {visibleColumns.map((col) => {
            const colTasks = tasksByStatus(col.key)
            const isTrashSelectionActive = trashSelectionStatus === col.key
            const dotColor = 
              col.key === "PENDING" ? "bg-[#3F9EA2]" :
              col.key === "IN_PROGRESS" ? "bg-[#016B6B]" :
              "bg-[#22C55E]"

            return (
              <Card key={col.key} className="overflow-hidden snap-start shrink-0 w-[85vw] sm:w-[22rem] md:w-[22rem] md:snap-none rounded-2xl border border-slate-200/60 bg-white dark:border-slate-850 dark:bg-[#1C1D1D] shadow-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 p-3.5 sm:px-4 sm:py-3 bg-slate-50/30 dark:bg-[#121313]/10">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                        <CardTitle className="text-sm font-poppins font-black text-slate-800 dark:text-slate-100 tracking-tight">{col.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-0 px-2 py-0.5 text-[10px]">
                          {colTasks.length}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startTrashSelection(col.key)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          aria-label={`Enviar tareas de ${col.title} a la papelera`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isTrashSelectionActive ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2.5 text-xs text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/10 dark:text-rose-300">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">
                            {selectedTrashCount} {selectedTrashCount === 1 ? "tarea seleccionada" : "tareas seleccionadas"}
                          </span>
                          <span className="text-[10px] font-medium">Modo papelera activo</span>
                        </div>
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={cancelTrashSelection}
                            className="h-8 rounded-lg border-rose-200 bg-transparent px-3 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-950/20"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={selectedTrashCount === 0 || trashSubmitting}
                            onClick={() => setTrashConfirmOpen(true)}
                            className="h-8 rounded-lg bg-rose-600 px-3 text-[11px] font-semibold text-white hover:bg-rose-700"
                          >
                            Enviar a la papelera
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3.5 sm:p-4 bg-slate-50/10 dark:bg-transparent min-h-[400px]">
                  {isInitialLoading ? (
                    <>
                      <SkeletonTaskCard />
                      <SkeletonTaskCard />
                      <SkeletonTaskCard />
                    </>
                  ) : (
                    <>
                      {colTasks.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          currentUser={currentUser}
                          users={users}
                          onOpen={() => setActiveTask(t)}
                          onQuickStatusChange={(status) => updateTask(t.id, { status })}
                          onAddComment={async (content) => addComment(t.id, content)}
                          selectionMode={isTrashSelectionActive}
                          selected={selectedTrashTaskSet.has(t.id)}
                          onSelectionChange={(next) => toggleTrashSelection(t.id, next)}
                        />
                      ))}
                      {tasksByStatus(col.key).length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200/60 p-8 text-center dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/10 min-h-[160px]">
                          <p className="text-xs text-slate-400 font-medium">Sin tareas en esta columna</p>
                          {tasks.length > 0 && filteredTasks.length === 0 && (
                            <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Filtros activos ocultando tareas</p>
                          )}
                        </div>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : null}

      {view === "list" ? (
        <TaskListView tasks={filteredTasks} users={users} currentUser={currentUser} onCreate={createTask} onUpdate={updateTask} />
      ) : null}

      {view === "table" ? (
        <TaskTableView tasks={filteredTasks} users={users} currentUser={currentUser} onUpdate={updateTask} />
      ) : null}

      {view === "timeline" ? <TaskTimelineView tasks={filteredTasks} /> : null}

      <CreateTaskDialog
        key={createOpen ? `create-task-${currentUser.id}` : "create-task-closed"}
        open={createOpen}
        onOpenChange={setCreateOpen}
        users={users}
        currentUser={currentUser}
        onCreate={async (input) => {
          try {
            await createTask(input)
            toast.success("Tarea creada")
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error")
            throw e
          }
        }}
      />

      <CreateUserDialog
        key={createUserOpen ? "kanban-create-user-open" : "kanban-create-user-closed"}
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        currentUser={currentUser}
        onCreated={() => {
          router.refresh()
        }}
      />

      <TaskModal
        key={activeTask ? `kanban-task-${activeTask.id}` : "kanban-task-closed"}
        open={!!activeTask}
        mode="detail"
        task={activeTask ?? undefined}
        users={users}
        currentUser={currentUser}
        onClose={() => setActiveTask(null)}
        onUpdate={async (id, patch) => {
          try {
            await updateTask(id, patch)
            toast.success("Actualizada")
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error")
          }
        }}
        onDelete={async (id) => {
          try {
            await deleteTask(id)
            toast.success("Enviada a la papelera")
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error")
          }
        }}
        onAddComment={async (taskId, content) => {
          try {
            await addComment(taskId, content)
            toast.success("Comentario agregado")
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error")
          }
        }}
        onAddAttachment={async (taskId, formData) => {
          try {
            await addAttachment(taskId, formData)
            toast.success("Archivo adjunto")
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error")
          }
        }}
        onDeleteAttachment={async (taskId, attachmentId) => {
          try {
            await deleteAttachment(taskId, attachmentId)
            toast.success("Adjunto eliminado")
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error")
          }
        }}
      />

      <Dialog open={trashConfirmOpen} onOpenChange={setTrashConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-[#1C1D1D]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-poppins font-black">
              <Trash2 className="h-4.5 w-4.5 text-rose-500" />
              <span>Enviar a la papelera</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              {selectedTrashCount} {selectedTrashCount === 1 ? "tarea será" : "tareas serán"} movida{selectedTrashCount === 1 ? "" : "s"} a la papelera de reciclaje y podrás restaurarla{selectedTrashCount === 1 ? "" : "s"} después.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTrashConfirmOpen(false)}
              disabled={trashSubmitting}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void submitTrashSelection()}
              disabled={selectedTrashCount === 0 || trashSubmitting}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
            >
              {trashSubmitting ? "Enviando..." : "Enviar a la papelera"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
