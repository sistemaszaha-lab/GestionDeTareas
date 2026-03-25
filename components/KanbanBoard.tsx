"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import type { TaskStatus, UserRole } from "@prisma/client"
import Button from "@/components/ui/Button"
import Select from "@/components/ui/Select"
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
  assignedToId: string
  createdAt: string | Date
  assignedTo: UserLite
  comments: CommentWithUser[]
}

type CurrentUser = { id: string; name: string; username: string; role: "ADMIN" | "EMPLOYEE" }

const columns: Array<{ key: TaskStatus; title: string }> = [
  { key: "PENDING", title: "Pending" },
  { key: "IN_PROGRESS", title: "In progress" },
  { key: "DONE", title: "Done" }
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
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const isInitialLoading = refreshing && tasks.length === 0

  const filteredTasks = useMemo(() => {
    if (filterUserId === "all") return tasks
    return tasks.filter((t) => t.assignedToId === filterUserId)
  }, [tasks, filterUserId])
  const statsBase = useMemo(() => {
    return currentUser.role === "ADMIN" ? filteredTasks : filteredTasks.filter((t) => t.assignedToId === currentUser.id)
  }, [filteredTasks, currentUser.id, currentUser.role])

  const totalCount = useMemo(() => statsBase.length, [statsBase])
  const pendingCount = useMemo(() => statsBase.filter((t) => t.status === "PENDING").length, [statsBase])
  const doneCount = useMemo(() => statsBase.filter((t) => t.status === "DONE").length, [statsBase])

  async function refresh() {
    setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (filterUserId !== "all") params.set("assignedToId", filterUserId)
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
  }, [])

  function tasksByStatus(status: TaskStatus) {
    return filteredTasks.filter((t) => t.status === status)
  }

  function SkeletonTaskCard() {
    return (
      <div className="rounded-lg border border-border bg-bg shadow-sm p-3 animate-pulse">
        <div className="h-4 w-3/4 rounded bg-border" />
        <div className="mt-2 h-3 w-full rounded bg-border" />
        <div className="mt-1 h-3 w-5/6 rounded bg-border" />
        <div className="mt-4 flex items-center justify-between">
          <div className="h-3 w-24 rounded bg-border" />
          <div className="h-5 w-16 rounded-full bg-border" />
        </div>
      </div>
    )
  }

  async function updateTask(
    id: string,
    patch: Partial<{ title: string; description: string | null; status: TaskStatus; assignedToId: string }>
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

  async function createTask(input: { title: string; description: string | null; assignedToId: string }) {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{pageTitle || "Dashboard"}</h1>
          <p className="text-sm text-fg-muted">
            Pendientes{currentUser.role === "ADMIN" && !forceUserId ? "" : " (mías)"}: <span className="font-medium text-fg">{pendingCount}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          {!forceUserId && (
            <Select
              label="Ver por usuario"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="min-w-56"
            >
              <option value="all">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          )}

          <div className="flex gap-2">
            <Button variant="ghost" onClick={refresh} loading={refreshing}>
              Refrescar
            </Button>
            {currentUser.role === "ADMIN" ? <Button onClick={() => setCreateOpen(true)}>Nueva tarea</Button> : null}
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isInitialLoading ? (
          <>
            <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
              <div className="h-3 w-24 rounded bg-border" />
              <div className="mt-2 h-7 w-16 rounded bg-border" />
            </div>
            <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
              <div className="h-3 w-28 rounded bg-border" />
              <div className="mt-2 h-7 w-16 rounded bg-border" />
            </div>
            <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
              <div className="h-3 w-32 rounded bg-border" />
              <div className="mt-2 h-7 w-16 rounded bg-border" />
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-fg-muted">Total de tareas{currentUser.role === "ADMIN" && !forceUserId ? "" : " (mías)"}</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{totalCount}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-fg-muted">Tareas pendientes{currentUser.role === "ADMIN" && !forceUserId ? "" : " (mías)"}</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{pendingCount}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-fg-muted">Tareas completadas{currentUser.role === "ADMIN" && !forceUserId ? "" : " (mías)"}</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{doneCount}</div>
            </div>
          </>
        )}
      </div>

      {isInitialLoading ? (
        <div className="text-sm text-fg-muted">Cargando tareas...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <div className="text-sm font-medium">No hay tareas</div>
          <div className="mt-1 text-xs text-fg-muted">Cuando se creen, aparecerán aquí agrupadas por estado.</div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const colTasks = tasksByStatus(col.key)
          return (
            <section key={col.key} className="rounded-xl border border-border bg-card">
              <header className="px-4 py-3 border-b border-border">
                <div className="text-sm font-semibold">{col.title}</div>
                <div className="text-xs text-fg-muted">{colTasks.length} tareas</div>
              </header>
              <div className="p-3 space-y-3">
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
                      <div className="text-xs text-fg-muted px-1 py-6 text-center">Sin tareas</div>
                    ) : null}
                  </>
                )}
              </div>
            </section>
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







