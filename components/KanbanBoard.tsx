"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import toast from "react-hot-toast"
import type { TaskPriority, TaskStatus, UserRole } from "@prisma/client"
import { Button } from "@/components/shadcn/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"
import { Label } from "@/components/shadcn/ui/label"
import { Input } from "@/components/shadcn/ui/input"
import { Select as ShadcnSelect } from "@/components/shadcn/ui/select"
import TaskCard from "@/components/TaskCard"
import TaskModal from "@/components/TaskModal"
import CreateTaskDialog from "@/components/CreateTaskDialog"

type UserLite = { id: string; name: string; username: string; role: UserRole }

type CommentWithUser = {
  id: string
  content: string
  createdAt: string | Date
  user: { id: string; name: string; username: string }
}

type TaskWithRelations = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignedToId: string
  dueDate: string | Date | null
  createdAt: string | Date
  assignedTo: UserLite
  comments: CommentWithUser[]
}

type CurrentUser = { id: string; name: string; username: string; role: "ADMIN" | "EMPLOYEE" }

const columns: Array<{ key: TaskStatus; title: string }> = [
  { key: "PENDING", title: "Pendiente" },
  { key: "IN_PROGRESS", title: "En progreso" },
  { key: "DONE", title: "Completada" }
]

export default function KanbanBoard({
  currentUser,
  users,
  initialTasks,
  forceUserId,
  pageTitle
}: {
  currentUser: CurrentUser
  users: UserLite[]
  initialTasks: TaskWithRelations[]
  forceUserId?: string
  pageTitle?: string
}) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks)
  const [filterUserId, setFilterUserId] = useState<string>(forceUserId ?? "all")
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all")
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all")
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const defaultQuickAssigneeId = useMemo(() => {
    if (filterUserId !== "all") return filterUserId
    const current = users.find((u) => u.id === currentUser.id)?.id
    return current ?? users[0]?.id ?? ""
  }, [currentUser.id, filterUserId, users])

  const [quickTitle, setQuickTitle] = useState("")
  const [quickDueDate, setQuickDueDate] = useState("")
  const [quickAssignedToId, setQuickAssignedToId] = useState<string>(defaultQuickAssigneeId)

  useEffect(() => {
    if (currentUser.role !== "ADMIN") return
    setQuickAssignedToId(defaultQuickAssigneeId)
  }, [currentUser.role, defaultQuickAssigneeId])

  const isInitialLoading = refreshing && tasks.length === 0

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterUserId !== "all" && t.assignedToId !== filterUserId) return false
      if (filterStatus !== "all" && t.status !== filterStatus) return false
      if (filterPriority !== "all" && t.priority !== filterPriority) return false
      return true
    })
  }, [tasks, filterUserId, filterStatus, filterPriority])

  const statsBase = useMemo(() => {
    return currentUser.role === "ADMIN" ? filteredTasks : filteredTasks.filter((t) => t.assignedToId === currentUser.id)
  }, [filteredTasks, currentUser.id, currentUser.role])

  const totalCount = useMemo(() => statsBase.length, [statsBase])
  const pendingCount = useMemo(() => statsBase.filter((t) => t.status === "PENDING").length, [statsBase])
  const doneCount = useMemo(() => statsBase.filter((t) => t.status === "DONE").length, [statsBase])

  const overdueCount = useMemo(() => {
    const now = Date.now()
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

  async function refresh() {
    setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (filterUserId !== "all") params.set("assignedToId", filterUserId)
      if (filterStatus !== "all") params.set("status", filterStatus)
      if (filterPriority !== "all") params.set("priority", filterPriority)
      const res = await fetch(`/api/tasks?${params.toString()}`, { cache: "no-store" })
      const data = (await res.json()) as { tasks?: TaskWithRelations[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar")
      setTasks(data.tasks ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUserId, filterStatus, filterPriority])

  const priorityRank: Record<TaskPriority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }

  function dueTime(dueDate: TaskWithRelations["dueDate"]) {
    if (!dueDate) return null
    const d = dueDate instanceof Date ? dueDate : new Date(dueDate)
    const t = d.getTime()
    return Number.isNaN(t) ? null : t
  }

  function tasksByStatus(status: TaskStatus) {
    const now = Date.now()

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

  async function updateTask(
    id: string,
    patch: Partial<{
      title: string
      description: string | null
      status: TaskStatus
      priority: TaskPriority
      assignedToId: string
      dueDate: string | null
    }>
  ) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    })
    const data = (await res.json()) as { task?: TaskWithRelations; error?: string }
    if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar")
    setTasks((prev) => prev.map((t) => (t.id === id ? (data.task as TaskWithRelations) : t)))
    setActiveTask((prev) => (prev?.id === id ? (data.task as TaskWithRelations) : prev))
  }

  async function createTask(input: {
    title: string
    description: string | null
    assignedToId: string
    priority: TaskPriority
    dueDate: string | null
  }) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    })
    const data = (await res.json()) as { task?: TaskWithRelations; error?: string }
    if (!res.ok) throw new Error(data.error ?? "No se pudo crear")
    setTasks((prev) => [data.task as TaskWithRelations, ...prev])
  }

  async function deleteTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    const data = (await res.json()) as { ok?: boolean; error?: string }
    if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar")
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setActiveTask((prev) => (prev?.id === id ? null : prev))
  }

  async function addComment(taskId: string, content: string) {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, content })
    })
    const data = (await res.json()) as { comment?: any; error?: string }
    if (!res.ok) throw new Error(data.error ?? "No se pudo comentar")
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, comments: [...t.comments, data.comment] } : t)))
    setActiveTask((prev) => (prev?.id === taskId ? { ...prev, comments: [...prev.comments, data.comment] } : prev))
  }

  async function quickCreate(e: FormEvent) {
    e.preventDefault()
    if (currentUser.role !== "ADMIN") return

    const t = quickTitle.trim()
    if (!t) return

    try {
      await createTask({
        title: t,
        description: null,
        assignedToId: quickAssignedToId || currentUser.id,
        priority: "MEDIUM",
        dueDate: quickDueDate ? quickDueDate : null
      })
      toast.success("Tarea creada")
      setQuickTitle("")
      setQuickDueDate("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900 dark:text-slate-50">{pageTitle || "Dashboard"}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>Resumen:</span>
            <Badge variant="secondary">Total {totalCount}</Badge>
            <Badge variant="outline">Pendientes {pendingCount}</Badge>
            
            <Badge variant="outline">Completadas {doneCount}</Badge>
            <Badge variant={overdueCount ? "danger" : "outline"}>Vencidas {overdueCount}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          {!forceUserId ? (
            <div className="space-y-2">
              <Label htmlFor="filter-user">Usuario</Label>
              <ShadcnSelect id="filter-user" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)}>
                <option value="all">Todos</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </ShadcnSelect>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="filter-status">Estado</Label>
            <ShadcnSelect
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="IN_PROGRESS">En progreso</option>
              <option value="DONE">Completada</option>
            </ShadcnSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-priority">Prioridad</Label>
            <ShadcnSelect
              id="filter-priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
            >
              <option value="all">Todas</option>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
            </ShadcnSelect>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={refresh} disabled={refreshing} className="w-full sm:flex-1">
              {refreshing ? "Refrescando..." : "Refrescar"}
            </Button>
            {currentUser.role === "ADMIN" ? (
              <Button variant="default" onClick={() => setCreateOpen(true)} className="w-full sm:flex-1">
                Nueva tarea
              </Button>
            ) : null}
          </div>
        </div>
      {currentUser.role === "ADMIN" ? (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
          <CardContent className="p-4">
            <form
              onSubmit={quickCreate}
              className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_auto_auto]"
            >
              <div className="space-y-1">
                <Label htmlFor="quick-title">Crear rápida</Label>
                <Input
                  id="quick-title"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder="Escribe un título y presiona Enter…"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="quick-due">Vence el</Label>
                <Input
                  id="quick-due"
                  type="date"
                  value={quickDueDate}
                  onChange={(e) => setQuickDueDate(e.target.value)}
                />
              </div>

              {!forceUserId ? (
                <div className="space-y-1">
                  <Label htmlFor="quick-assignee">Asignar a</Label>
                  <ShadcnSelect
                    id="quick-assignee"
                    value={quickAssignedToId}
                    onChange={(e) => setQuickAssignedToId(e.target.value)}
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </ShadcnSelect>
                </div>
              ) : null}

              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={!quickTitle.trim()}>
                  Crear
                </Button>
              </div>
            </form>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Tip: si filtraste por usuario, se asigna automáticamente.
            </div>
          </CardContent>
        </Card>
      ) : null}
      </div>

      {isInitialLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SkeletonTaskCard />
          <SkeletonTaskCard />
          <SkeletonTaskCard />
        </div>
      ) : null}

      {!isInitialLoading && filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-50">No hay tareas</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Cuando se creen, aparecerán aquí agrupadas por estado.</div>
          </CardContent>
        </Card>
      ) : null}

      <div
        className={[
          "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 touch-pan-x scroll-px-4",
          "md:mx-0 md:grid md:snap-none md:gap-4 md:overflow-visible md:px-0 md:pb-0 md:touch-auto md:scroll-px-0",
          filterStatus === "all" ? "md:grid-cols-3" : "md:grid-cols-1"
        ].join(" ")}
      >
        {visibleColumns.map((col) => {
          const colTasks = tasksByStatus(col.key)
          return (
            <Card key={col.key} className="overflow-hidden snap-start shrink-0 w-[85vw] sm:w-[22rem] md:w-auto md:shrink md:snap-none">
              <CardHeader className="border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{col.title}</CardTitle>
                  <Badge variant="secondary">{colTasks.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4">
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
                        onQuickAssigneeChange={(assignedToId) => updateTask(t.id, { assignedToId })}
                        onAddComment={async (content) => addComment(t.id, content)}
                      />
                    ))}
                    {colTasks.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-600 dark:text-slate-400">Sin tareas</div>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <CreateTaskDialog
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

      <TaskModal
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
            toast.success("Eliminada")
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
      />
    </div>
  )
}
