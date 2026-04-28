"use client"

import { useEffect, useMemo, useState } from "react"
import type { TaskPriority, TaskStatus, UserRole } from "@prisma/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/shadcn/ui/dialog"
import { Button } from "@/components/shadcn/ui/button"
import { Input } from "@/components/shadcn/ui/input"
import { Textarea } from "@/components/shadcn/ui/textarea"
import { Label } from "@/components/shadcn/ui/label"
import { Select as ShadcnSelect } from "@/components/shadcn/ui/select"
import { Badge } from "@/components/shadcn/ui/badge"
import { Card, CardContent } from "@/components/shadcn/ui/card"
import { cn } from "@/lib/ui"
import { MultiSelect } from "@/components/ui/MultiSelect"

type UserLite = { id: string; name: string; username: string; role: UserRole }

type CommentWithUser = {
  id: string
  content: string
  createdAt: string | Date
  user: { id: string; name: string; username: string }
}

type Attachment = {
  id: string
  name: string
  url: string
  type: "file" | "link"
  fileType?: string
  createdAt: string
}

type TaskWithRelations = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | Date | null
  assignedUsers: UserLite[]
  comments: CommentWithUser[]
  attachments?: Attachment[] | null
}

type CurrentUser = { id: string; role: "ADMIN" | "USER" }

function toInputDate(value: string | Date | null | undefined) {
  if (!value) return ""
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function dueDateToDate(input: string) {
  const d = new Date(`${input}T23:59:59.999Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export default function TaskModal(props: {
  open: boolean
  mode: "create" | "detail"
  task?: TaskWithRelations
  users: UserLite[]
  currentUser: CurrentUser
  onClose: () => void
  onCreate?: (input: {
    title: string
    description: string | null
    assignedUserIds: string[]
    priority: TaskPriority
    dueDate: string | null
  }) => Promise<void>
  onUpdate?: (
    id: string,
    patch: Partial<{
      title: string
      description: string | null
      status: TaskStatus
      priority: TaskPriority
      assignedUserIds: string[]
      dueDate: string | null
    }>
  ) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onAddComment?: (taskId: string, content: string) => Promise<void>
  onAddAttachment?: (taskId: string, formData: FormData) => Promise<void>
  onDeleteAttachment?: (taskId: string, attachmentId: string) => Promise<void>
}) {
  const { open, mode, task, users, currentUser, onClose } = props

  const canAdmin = currentUser.role === "ADMIN"
  const canEditStatus = useMemo(() => {
    if (!task) return false
    return canAdmin || task.assignedUsers.some((u) => u.id === currentUser.id)
  }, [canAdmin, currentUser.id, task])

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([])
  const [status, setStatus] = useState<TaskStatus>("PENDING")
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM")
  const [dueDate, setDueDate] = useState("")
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [uploadMode, setUploadMode] = useState<"file" | "link" | null>(null)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkName, setLinkName] = useState("")
  const [attaching, setAttaching] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === "create") {
      setTitle("")
      setDescription("")
      setAssignedUserIds([])
      setStatus("PENDING")
      setPriority("MEDIUM")
      setDueDate("")
      setComment("")
      return
    }
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? "")
    setAssignedUserIds(task.assignedUsers.map((u) => u.id))
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(toInputDate(task.dueDate))
    setComment("")
  }, [open, mode, task, users])

  async function create() {
    if (!props.onCreate) return
    if (!title.trim()) return
    setSaving(true)
    try {
      await props.onCreate({
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        assignedUserIds,
        priority,
        dueDate: dueDate ? dueDate : null
      })
    } finally {
      setSaving(false)
    }
  }

  async function save() {
    if (!task || !props.onUpdate) return
    setSaving(true)
    try {
      const patch: any = {}
      if (canAdmin) {
        patch.title = title.trim()
        patch.description = description.trim() ? description.trim() : null
        patch.assignedUserIds = assignedUserIds
        patch.priority = priority
        patch.dueDate = dueDate ? dueDate : null
      }
      if (canEditStatus) patch.status = status
      await props.onUpdate(task.id, patch)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!task || !props.onDelete) return
    setDeleting(true)
    try {
      await props.onDelete(task.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  async function addComment() {
    if (!task || !props.onAddComment) return
    const content = comment.trim()
    if (!content) return
    setSaving(true)
    try {
      await props.onAddComment(task.id, content)
      setComment("")
    } finally {
      setSaving(false)
    }
  }

  async function addAttachment() {
    if (!task || !props.onAddAttachment) return
    if (uploadMode === "file" && !fileToUpload) return
    if (uploadMode === "link" && (!linkUrl || !linkName)) return

    setAttaching(true)
    try {
      const formData = new FormData()
      if (uploadMode === "file" && fileToUpload) {
        formData.append("file", fileToUpload)
      } else {
        formData.append("url", linkUrl)
        formData.append("name", linkName)
      }
      await props.onAddAttachment(task.id, formData)
      setFileToUpload(null)
      setLinkUrl("")
      setLinkName("")
      setUploadMode(null)
    } finally {
      setAttaching(false)
    }
  }

  async function removeAttachment(attachmentId: string) {
    if (!task || !props.onDeleteAttachment) return
    if (!confirm("¿Eliminar archivo adjunto?")) return
    setAttaching(true)
    try {
      await props.onDeleteAttachment(task.id, attachmentId)
    } finally {
      setAttaching(false)
    }
  }

  const modalTitle = mode === "create" ? "Nueva tarea" : "Detalle de tarea"

  const statusBadgeVariant = status === "DONE" ? "success" : status === "IN_PROGRESS" ? "default" : "secondary"
  const priorityBadgeVariant = priority === "HIGH" ? "danger" : priority === "LOW" ? "secondary" : "outline"

  const dueDateObj = dueDate ? dueDateToDate(dueDate) : null
  const isOverdue = Boolean(dueDateObj && status !== "DONE" && dueDateObj.getTime() < Date.now())

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          {mode === "create" ? (
            <DialogDescription>Crea una tarea y quedará visible inmediatamente en el tablero.</DialogDescription>
          ) : null}
        </DialogHeader>

        {mode === "create" ? (
          <div className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="task-title">Título</Label>
                <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="task-description">Descripción</Label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Agrega contexto, criterios de aceptación, links…"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-priority">Prioridad</Label>
                <ShadcnSelect id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                </ShadcnSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-due">Vence el</Label>
                <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="task-assigned">Asignar a</Label>
                <MultiSelect
                  options={users}
                  selected={assignedUserIds}
                  onChange={setAssignedUserIds}
                  placeholder="Seleccionar usuarios..."
                />
              </div>
            </div>

            <DialogFooter className="px-0">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={create} disabled={saving || !title.trim()}>
                {saving ? "Creando…" : "Crear"}
              </Button>
            </DialogFooter>
          </div>
        ) : task ? (
          <div className="px-6 pb-6 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={priorityBadgeVariant as any}>{priority}</Badge>
              <Badge variant={statusBadgeVariant as any}>{status}</Badge>
              <div className="flex -space-x-2 overflow-hidden ml-1">
                {task.assignedUsers.map((u) => (
                  <div
                    key={u.id}
                    title={u.name}
                    className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold uppercase"
                  >
                    {u.name.slice(0, 2)}
                  </div>
                ))}
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {task.assignedUsers.length > 1 ? `${task.assignedUsers.length} asignados` : task.assignedUsers[0]?.name || "Sin asignar"}
              </span>
              {dueDateObj ? (
                <span
                  className={cn(
                    "text-xs",
                    isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  {isOverdue ? "Vencida: " : "Vence: "}
                  {dueDateObj.toLocaleDateString("es-MX")}
                </span>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400">Sin vencimiento</span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-title">Título</Label>
                <Input id="detail-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canAdmin} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-assigned">Asignados</Label>
                <MultiSelect
                  options={users}
                  selected={assignedUserIds}
                  onChange={setAssignedUserIds}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="detail-status">Estado</Label>
                <ShadcnSelect
                  id="detail-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  disabled={!canEditStatus}
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="IN_PROGRESS">En progreso</option>
                  <option value="DONE">Completada</option>
                </ShadcnSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="detail-priority">Prioridad</Label>
                <ShadcnSelect
                  id="detail-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  disabled={!canAdmin}
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                </ShadcnSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="detail-due">Vence el</Label>
                <Input
                  id="detail-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!canAdmin}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-description">Descripción</Label>
                <Textarea
                  id="detail-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canAdmin}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 pb-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Archivos adjuntos</div>
                {!uploadMode && canEditStatus ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setUploadMode("file")}>
                      Subir archivo
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setUploadMode("link")}>
                      Añadir enlace
                    </Button>
                  </div>
                ) : null}
              </div>

              {uploadMode === "file" ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50 dark:bg-slate-950/40">
                  <Label>Seleccionar archivo (Max 5MB)</Label>
                  <Input type="file" onChange={(e) => setFileToUpload(e.target.files?.[0] ?? null)} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setUploadMode(null); setFileToUpload(null) }}>Cancelar</Button>
                    <Button size="sm" onClick={addAttachment} disabled={!fileToUpload || attaching}>
                      {attaching ? "Subiendo..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {uploadMode === "link" ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50 dark:bg-slate-950/40">
                  <div className="space-y-2">
                    <Label>URL del enlace</Label>
                    <Input placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre a mostrar</Label>
                    <Input placeholder="Documento de Google" value={linkName} onChange={(e) => setLinkName(e.target.value)} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setUploadMode(null); setLinkUrl(""); setLinkName("") }}>Cancelar</Button>
                    <Button size="sm" onClick={addAttachment} disabled={!linkUrl || !linkName || attaching}>
                      {attaching ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(!task.attachments || task.attachments.length === 0) && !uploadMode ? (
                  <div className="text-xs text-slate-500 col-span-2">No hay archivos adjuntos.</div>
                ) : (
                  (task.attachments || []).map((att: Attachment) => (
                    <div key={att.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex-shrink-0 text-xl">
                          {att.type === "link" ? "🔗" : att.fileType?.includes("pdf") ? "📄" : att.fileType?.includes("image") ? "🖼️" : "📁"}
                        </div>
                        <div className="min-w-0">
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate block">
                            {att.name}
                          </a>
                          <div className="text-[10px] text-slate-500 uppercase">{att.type}</div>
                        </div>
                      </div>
                      {canEditStatus ? (
                        <button onClick={() => removeAttachment(att.id)} disabled={attaching} className="text-slate-400 hover:text-rose-500 p-1">
                          ✕
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-600 dark:text-slate-400">Comentarios ({task.comments.length})</div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                {canAdmin ? (
                  <Button variant="danger" onClick={remove} disabled={deleting} className="w-full sm:w-auto">
                    {deleting ? "Eliminando…" : "Eliminar"}
                  </Button>
                ) : null}
                <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
                  {saving ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </div>

            <div className="max-h-64 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-2">
              {task.comments.length === 0 ? (
                <div className="text-xs text-slate-600 dark:text-slate-400">Sin comentarios</div>
              ) : (
                task.comments.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-50">{c.user.name}</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-slate-900 dark:text-slate-50 whitespace-pre-wrap">{c.content}</div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="new-comment">Agregar comentario</Label>
                <Input
                  id="new-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escribe un comentario…"
                />
              </div>
              <Button onClick={addComment} disabled={saving || !comment.trim()} className="sm:mb-0">
                {saving ? "Enviando…" : "Enviar"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}