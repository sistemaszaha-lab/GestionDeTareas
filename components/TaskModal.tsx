"use client"

import { useEffect, useMemo, useState } from "react"
import type { TaskStatus, UserRole } from "@prisma/client"
import Modal from "@/components/ui/Modal"
import Input from "@/components/ui/Input"
import Select from "@/components/ui/Select"
import Button from "@/components/ui/Button"

type UserLite = { id: string; name: string; email: string; role: UserRole }

type CommentWithUser = {
  id: string
  content: string
  createdAt: string | Date
  user: { id: string; name: string; email: string }
}

type TaskWithRelations = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
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
  onCreate?: (input: { title: string; description: string | null; assignedToId: string }) => Promise<void>
  onUpdate?: (
    id: string,
    patch: Partial<{ title: string; description: string | null; status: TaskStatus; assignedToId: string }>
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
      setComment("")
      return
    }
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? "")
    setAssignedToId(task.assignedToId)
    setStatus(task.status)
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
        assignedToId
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

  return (
    <Modal open={open} title={modalTitle} onClose={onClose}>
      {mode === "create" ? (
        <div className="space-y-4">
          <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="block">
            <span className="text-sm font-medium">Descripción</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-h-24"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <Select label="Asignar a" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button onClick={create} loading={saving} type="button">
              Crear
            </Button>
          </div>
        </div>
      ) : task ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canAdmin} />
            <Select
              label="Asignado a"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              disabled={!canAdmin}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
            <div className="md:col-span-2">
              <label className="block">
                <span className="text-sm font-medium">Descripción</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-h-24"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canAdmin}
                />
              </label>
            </div>
            <Select
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              disabled={!canEditStatus}
            >
              <option value="PENDING">PENDING</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
            </Select>
          </div>

          <div className="flex justify-between items-center gap-2">
            <div className="text-xs text-fg-muted">Comentarios ({task.comments.length})</div>
            <div className="flex gap-2">
              {canAdmin ? (
                <Button variant="danger" onClick={remove} loading={deleting} type="button">
                  Eliminar
                </Button>
              ) : null}
              <Button onClick={save} loading={saving} type="button">
                Guardar
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-64 overflow-auto rounded-lg border border-border p-3 bg-bg-subtle">
            {task.comments.length === 0 ? (
              <div className="text-xs text-fg-muted">Sin comentarios</div>
            ) : (
              task.comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium">{c.user.name}</div>
                    <div className="text-[11px] text-fg-muted">{new Date(c.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="mt-2 text-sm whitespace-pre-wrap">{c.content}</div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              label="Agregar comentario"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe un comentario…"
            />
            <Button onClick={addComment} loading={saving} type="button" className="sm:self-end">
              Enviar
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
