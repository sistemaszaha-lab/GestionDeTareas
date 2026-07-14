"use client"

import { useMemo, useState } from "react"
import toast from "react-hot-toast"
import type { TaskStatus } from "@prisma/client"
import { Button } from "@/components/shadcn/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"
import { Input } from "@/components/shadcn/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/shadcn/ui/dialog"
import { fetchJsonOrThrow } from "@/lib/fetch-json"
import { cn } from "@/lib/ui"
import {
  AlertTriangle,
  CalendarClock,
  MessageSquare,
  Paperclip,
  RotateCcw,
  Search,
  Trash2,
  Users
} from "lucide-react"

type AttachmentRecord = {
  id: string
  name: string
  url: string
  type: "file" | "link"
  fileType?: string
  createdAt?: string
}

type TrashTask = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: "LOW" | "MEDIUM" | "HIGH"
  dueDate: string | Date | null
  createdAt: string | Date
  deletedAt: string | Date | null
  deletedBy: { id: string; name: string; username: string } | null
  assignedUsers: Array<{ id: string; name: string; username: string }>
  attachments?: AttachmentRecord[] | null
  tags?: string[] | null
  comments?: Array<{ id: string }>
}

type Props = {
  initialTasks: TrashTask[]
  nowIso: string
  embedded?: boolean
}

type RestoreResponse = {
  ok?: boolean
  warnings?: string[]
}

type PermanentDeleteResponse = {
  ok?: boolean
  deletedCount?: number
  warnings?: string[]
}

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000

const statusLabels: Record<TaskStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En progreso",
  DONE: "Completada"
}

const statusStyles: Record<TaskStatus, string> = {
  PENDING: "bg-[#3F9EA2]/15 text-[#3F9EA2] dark:bg-[#3F9EA2]/10",
  IN_PROGRESS: "bg-[#016B6B]/15 text-[#016B6B] dark:bg-[#3F9EA2]/10 dark:text-[#3F9EA2]",
  DONE: "bg-[#22C55E]/15 text-[#22C55E] dark:bg-[#22C55E]/10"
}

function formatDate(value: string | Date | null) {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City"
  }).format(date)
}

function getDeadlineInfo(deletedAt: string | Date | null, nowIso: string) {
  if (!deletedAt) {
    return {
      deadline: "—",
      remaining: "Sin fecha",
      isExpired: false
    }
  }

  const deletedAtDate = deletedAt instanceof Date ? deletedAt : new Date(deletedAt)
  const now = new Date(nowIso)
  if (Number.isNaN(deletedAtDate.getTime()) || Number.isNaN(now.getTime())) {
    return {
      deadline: "—",
      remaining: "Sin fecha",
      isExpired: false
    }
  }

  const deadlineDate = new Date(deletedAtDate.getTime() + THIRTY_DAYS_IN_MS)
  const msRemaining = deadlineDate.getTime() - now.getTime()
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000))

  let remaining = `${daysRemaining} días restantes`
  let isExpired = false

  if (daysRemaining === 1) remaining = "1 día restante"
  if (daysRemaining === 0) remaining = "Se elimina hoy"
  if (daysRemaining < 0) {
    remaining = "Vencida"
    isExpired = true
  }

  return {
    deadline: formatDate(deadlineDate),
    remaining,
    isExpired
  }
}

function normalizeAttachments(value: TrashTask["attachments"]) {
  return Array.isArray(value) ? value : []
}

function showWarnings(warnings: string[] | undefined) {
  if (!warnings || warnings.length === 0) return

  warnings.slice(0, 2).forEach((warning) => {
    toast(warning, { icon: "⚠️" })
  })

  if (warnings.length > 2) {
    toast(`${warnings.length - 2} advertencias adicionales en la restauración.`, { icon: "⚠️" })
  }
}

export default function RecycleBinClient({ initialTasks, nowIso, embedded = false }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [query, setQuery] = useState("")
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [restoring, setRestoring] = useState(false)
  const [purging, setPurging] = useState(false)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [permanentConfirmOpen, setPermanentConfirmOpen] = useState(false)
  const [fallbackOpen, setFallbackOpen] = useState(false)
  const [fallbackTask, setFallbackTask] = useState<TrashTask | null>(null)
  const [fallbackColumn, setFallbackColumn] = useState<TaskStatus>("PENDING")
  const [taskIdsPendingPermanentDelete, setTaskIdsPendingPermanentDelete] = useState<string[]>([])

  const boardLabel = "Tablero general"
  const selectedTaskSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds])
  const selectedCount = selectedTaskIds.length

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tasks

    return tasks.filter((task) => {
      const haystack = [
        task.title,
        task.description ?? "",
        statusLabels[task.status],
        task.deletedBy?.name ?? "",
        task.assignedUsers.map((user) => user.name).join(" "),
        normalizeAttachments(task.attachments).map((attachment) => attachment.name).join(" "),
        (task.tags ?? []).join(" "),
        boardLabel
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [boardLabel, query, tasks])

  function toggleSelection(taskId: string, checked: boolean) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(taskId)
      else next.delete(taskId)
      return Array.from(next)
    })
  }

  function clearSelection() {
    setSelectedTaskIds([])
    setRestoreConfirmOpen(false)
    setPermanentConfirmOpen(false)
    setTaskIdsPendingPermanentDelete([])
  }

  function removeTasksFromState(taskIds: string[]) {
    setTasks((prev) => prev.filter((task) => !taskIds.includes(task.id)))
    setSelectedTaskIds((prev) => prev.filter((taskId) => !taskIds.includes(taskId)))
  }

  async function restoreSelectedTasks(taskIds: string[], columnId?: TaskStatus) {
    if (taskIds.length === 0 || restoring) return

    setRestoring(true)
    try {
      const response = await fetchJsonOrThrow<RestoreResponse>(
        "/api/tasks/trash/restore",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(columnId ? { taskIds, columnId } : { taskIds })
        },
        { defaultError: "No se pudo restaurar", logTag: "POST /api/tasks/trash/restore" }
      )

      removeTasksFromState(taskIds)
      setRestoreConfirmOpen(false)
      setFallbackOpen(false)
      setFallbackTask(null)
      toast.success(taskIds.length === 1 ? "Tarea restaurada" : "Tareas restauradas")
      showWarnings(response.warnings)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error"
      if (message.toLowerCase().includes("columna original") && taskIds.length === 1) {
        const task = tasks.find((item) => item.id === taskIds[0]) ?? null
        setFallbackTask(task)
        setFallbackColumn(task?.status ?? "PENDING")
        setFallbackOpen(true)
      } else {
        toast.error(message)
      }
    } finally {
      setRestoring(false)
    }
  }

  function openPermanentDeleteDialog(taskIds: string[]) {
    setTaskIdsPendingPermanentDelete(taskIds)
    setPermanentConfirmOpen(true)
  }

  async function permanentlyDeleteSelectedTasks(taskIds: string[]) {
    if (taskIds.length === 0 || purging) return

    setPurging(true)
    try {
      const response = await fetchJsonOrThrow<PermanentDeleteResponse>(
        "/api/tasks/trash/permanent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskIds })
        },
        { defaultError: "No se pudo eliminar permanentemente", logTag: "POST /api/tasks/trash/permanent" }
      )

      removeTasksFromState(taskIds)
      setPermanentConfirmOpen(false)
      setTaskIdsPendingPermanentDelete([])
      toast.success(taskIds.length === 1 ? "Tarea eliminada permanentemente" : "Tareas eliminadas permanentemente")
      showWarnings(response.warnings)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error")
    } finally {
      setPurging(false)
    }
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
            Papelera de reciclaje
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Tareas eliminadas lógicamente durante 30 días antes de su limpieza automática.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-slate-100 text-slate-600 border-0 dark:bg-slate-800 dark:text-slate-300">
            {tasks.length} {tasks.length === 1 ? "tarea" : "tareas"}
          </Badge>
          <Badge className="bg-[#016B6B]/10 text-[#016B6B] border-0 dark:bg-[#3F9EA2]/10 dark:text-[#3F9EA2]">
            {boardLabel}
          </Badge>
        </div>
      </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-slate-100 text-slate-600 border-0 dark:bg-slate-800 dark:text-slate-300">
            {tasks.length} {tasks.length === 1 ? "tarea" : "tareas"}
          </Badge>
          <Badge className="bg-[#016B6B]/10 text-[#016B6B] border-0 dark:bg-[#3F9EA2]/10 dark:text-[#3F9EA2]">
            {boardLabel}
          </Badge>
        </div>
      )}

      <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#1C1D1D] shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por título, responsable, adjunto o etiqueta..."
                className="h-10 rounded-xl pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-xl px-3 py-1 text-[11px] font-semibold">
                {selectedCount} seleccionadas
              </Badge>
              <Button type="button" variant="outline" onClick={clearSelection} disabled={selectedCount === 0} className="rounded-xl">
                Cancelar selección
              </Button>
              <Button
                type="button"
                onClick={() => setRestoreConfirmOpen(true)}
                disabled={selectedCount === 0 || restoring}
                className="rounded-xl bg-[#016B6B] text-white hover:bg-[#3F9EA2]"
              >
                {restoring ? "Restaurando..." : "Restaurar seleccionadas"}
              </Button>
              <Button
                type="button"
                onClick={() => openPermanentDeleteDialog(selectedTaskIds)}
                disabled={selectedCount === 0 || purging}
                className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              >
                {purging ? "Eliminando..." : "Eliminar seleccionadas"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredTasks.map((task) => {
          const attachments = normalizeAttachments(task.attachments)
          const deadlineInfo = getDeadlineInfo(task.deletedAt, nowIso)

          return (
            <Card
              key={task.id}
              className={cn(
                "overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-[#1C1D1D]",
                selectedTaskSet.has(task.id) ? "ring-2 ring-[#016B6B] dark:ring-[#3F9EA2]" : ""
              )}
            >
              <CardHeader className="border-b border-slate-100/80 bg-slate-50/40 p-4 dark:border-slate-800/60 dark:bg-[#121313]/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        aria-label={`Seleccionar ${task.title}`}
                        type="checkbox"
                        checked={selectedTaskSet.has(task.id)}
                        onChange={(e) => toggleSelection(task.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#016B6B] focus:ring-[#016B6B] accent-[#016B6B]"
                      />
                      <CardTitle className="line-clamp-2 text-sm font-poppins font-black tracking-tight text-slate-800 dark:text-slate-100">
                        {task.title}
                      </CardTitle>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn("text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border-0", statusStyles[task.status])}>
                        {statusLabels[task.status]}
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-600 border-0 text-[9px] font-bold uppercase tracking-wider dark:bg-slate-800 dark:text-slate-300">
                        {task.priority}
                      </Badge>
                      {deadlineInfo.isExpired ? (
                        <Badge className="bg-rose-100 text-rose-600 border-0 text-[9px] font-bold uppercase tracking-wider dark:bg-rose-950/20 dark:text-rose-300">
                          Vencida
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void restoreSelectedTasks([task.id])}
                      disabled={restoring}
                      className="h-8 w-8 p-0 text-[#016B6B] hover:bg-[#016B6B]/5 hover:text-[#3F9EA2]"
                      aria-label={`Restaurar ${task.title}`}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => openPermanentDeleteDialog([task.id])}
                      disabled={purging}
                      className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20"
                      aria-label={`Eliminar permanentemente ${task.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-4">
                {task.description ? (
                  <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
                ) : (
                  <p className="text-sm text-slate-400">Sin descripción</p>
                )}

                <div className="grid gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>Eliminada: {formatDate(task.deletedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Límite: {deadlineInfo.deadline}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#016B6B]/10 text-[9px] font-black text-[#016B6B]">30</span>
                    <span>{deadlineInfo.remaining}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    <span>Eliminó: {task.deletedBy?.name ?? "Usuario no disponible"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Columna original: {statusLabels[task.status]}</span>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 dark:border-slate-800/70 dark:bg-slate-900/20">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Responsables</span>
                    <span className="text-slate-400">{task.assignedUsers.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {task.assignedUsers.length > 0 ? (
                      task.assignedUsers.map((user) => (
                        <Badge key={user.id} variant="outline" className="rounded-lg text-[10px]">
                          {user.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400">Sin usuarios asignados vigentes</span>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>{attachments.length} {attachments.length === 1 ? "adjunto" : "adjuntos"}</span>
                  </div>
                  {attachments.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {attachments.slice(0, 3).map((attachment) => (
                        <Badge key={attachment.id} variant="outline" className="rounded-lg text-[10px]">
                          {attachment.name}
                        </Badge>
                      ))}
                      {attachments.length > 3 ? (
                        <Badge variant="outline" className="rounded-lg text-[10px]">
                          +{attachments.length - 3} más
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{task.comments?.length ?? 0} {task.comments?.length === 1 ? "comentario" : "comentarios"}</span>
                  </div>
                  {(task.tags?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {task.tags?.map((tag) => (
                        <Badge key={tag} className="bg-[#016B6B]/10 text-[#016B6B] border-0 text-[10px] dark:bg-[#3F9EA2]/10 dark:text-[#3F9EA2]">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredTasks.length === 0 ? (
          <Card className="col-span-full rounded-2xl border-dashed border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-[#1C1D1D]/50">
            <CardContent className="flex min-h-[220px] items-center justify-center p-8 text-center">
              <div className="space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  <Trash2 className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No hay tareas en la papelera</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-[#1C1D1D]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-poppins font-black">
              <RotateCcw className="h-4.5 w-4.5 text-[#016B6B]" />
              <span>Restaurar tareas</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              {selectedCount} {selectedCount === 1 ? "tarea volverá" : "tareas volverán"} a su columna original con sus responsables, comentarios y adjuntos actuales.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setRestoreConfirmOpen(false)} disabled={restoring} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void restoreSelectedTasks(selectedTaskIds)}
              disabled={selectedCount === 0 || restoring}
              className="rounded-xl bg-[#016B6B] text-white hover:bg-[#3F9EA2]"
            >
              {restoring ? "Restaurando..." : "Restaurar seleccionadas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permanentConfirmOpen} onOpenChange={setPermanentConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-[#1C1D1D]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-poppins font-black text-rose-600 dark:text-rose-400">
              <Trash2 className="h-4.5 w-4.5" />
              <span>Eliminar permanentemente</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              {taskIdsPendingPermanentDelete.length} {taskIdsPendingPermanentDelete.length === 1 ? "tarea será eliminada" : "tareas serán eliminadas"} de forma definitiva. Esta acción no se puede deshacer y también retirará sus adjuntos asociados cuando corresponda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPermanentConfirmOpen(false)} disabled={purging} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void permanentlyDeleteSelectedTasks(taskIdsPendingPermanentDelete)}
              disabled={taskIdsPendingPermanentDelete.length === 0 || purging}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
            >
              {purging ? "Eliminando..." : "Eliminar permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-[#1C1D1D]">
          <DialogHeader>
            <DialogTitle className="text-base font-poppins font-black">Elegir columna</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              La columna original no está disponible. Elige una columna válida para restaurar la tarea.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 px-6">
            <label className="text-xs font-semibold text-slate-500" htmlFor="fallback-column">
              Columna destino
            </label>
            <select
              id="fallback-column"
              value={fallbackColumn}
              onChange={(e) => setFallbackColumn(e.target.value as TaskStatus)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-[#121313] dark:text-slate-200"
            >
              <option value="PENDING">Pendiente</option>
              <option value="IN_PROGRESS">En progreso</option>
              <option value="DONE">Completada</option>
            </select>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setFallbackOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!fallbackTask) return
                void restoreSelectedTasks([fallbackTask.id], fallbackColumn)
              }}
              className="rounded-xl bg-[#016B6B] text-white hover:bg-[#3F9EA2]"
            >
              Restaurar en esta columna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
