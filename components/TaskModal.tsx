"use client"

import { useEffect, useMemo, useState } from "react"
import type { TaskPriority, TaskStatus, UserRole } from "@prisma/client"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/ui/dialog"
import { Button } from "@/components/shadcn/ui/button"
import { Input } from "@/components/shadcn/ui/input"
import { Textarea } from "@/components/shadcn/ui/textarea"
import { Label } from "@/components/shadcn/ui/label"
import { Select as ShadcnSelect } from "@/components/shadcn/ui/select"
import { Badge } from "@/components/shadcn/ui/badge"
import { Card, CardContent } from "@/components/shadcn/ui/card"

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
  assignedTo: UserLite
  comments: CommentWithUser[]
}

type CurrentUser = { id: string; role: "ADMIN" | "EMPLOYEE" }

export default function TaskModal(props: {
  open: boolean
  mode: "create" | "detail"
  task?: TaskWithRelations
  users: UserLite[]
  currentUser: CurrentUser
  onClose: () => void
  onCreate?: (input: { title: string; description: string | null; assignedToId: string; priority: TaskPriority }) => Promise<void>
  onUpdate?: (
    id: string,
    patch: Partial<{
      title: string
      description: string | null
      status: TaskStatus
      priority: TaskPriority
      assignedToId: string
    }>
  ) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onAddComment?: (taskId: string, content: string) => Promise<void>
}) {
  const { open, mode, task, users, currentUser, onClose } = props

  const canAdmin = currentUser.role === "ADMIN"
  const canEditStatus = useMemo(() => {
    if (!task) return false
    return canAdmin || task.assignedToId === currentUser.id
  }, [canAdmin, currentUser.id, task])

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedToId, setAssignedToId] = useState<string>(users[0]?.id ?? "")
  const [status, setStatus] = useState<TaskStatus>("PENDING")
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM")
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === "create") {
      setTitle("")
      setDescription("")
      setAssignedToId(users[0]?.id ?? "")
      setStatus("PENDING")
      setPriority("MEDIUM")
      setComment("")
      return
    }
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? "")
    setAssignedToId(task.assignedToId)
    setStatus(task.status)
    setPriority(task.priority)
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
        assignedToId,
        priority
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
        patch.assignedToId = assignedToId
        patch.priority = priority
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

  const modalTitle = mode === "create" ? "Nueva tarea" : "Detalle de tarea"

  const statusBadgeVariant = status === "DONE" ? "success" : status === "IN_PROGRESS" ? "default" : "secondary"
  const priorityBadgeVariant = priority === "HIGH" ? "danger" : priority === "LOW" ? "secondary" : "outline"

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
                <ShadcnSelect
                  id="task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                </ShadcnSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-assigned">Asignar a</Label>
                <ShadcnSelect
                  id="task-assigned"
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </ShadcnSelect>
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
              <span className="text-xs text-slate-500">Asignado: {task.assignedTo.name}</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-title">Título</Label>
                <Input
                  id="detail-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!canAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="detail-assigned">Asignado a</Label>
                <ShadcnSelect
                  id="detail-assigned"
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  disabled={!canAdmin}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </ShadcnSelect>
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

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">Comentarios ({task.comments.length})</div>
              <div className="flex gap-2">
                {canAdmin ? (
                  <Button variant="danger" onClick={remove} disabled={deleting}>
                    {deleting ? "Eliminando…" : "Eliminar"}
                  </Button>
                ) : null}
                <Button onClick={save} disabled={saving}>
                  {saving ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </div>

            <div className="max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              {task.comments.length === 0 ? (
                <div className="text-xs text-slate-500">Sin comentarios</div>
              ) : (
                task.comments.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium text-slate-900">{c.user.name}</div>
                        <div className="text-[11px] text-slate-500">{new Date(c.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{c.content}</div>
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

