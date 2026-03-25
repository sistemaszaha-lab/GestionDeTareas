"use client"

import { useEffect, useMemo, useState } from "react"
import type { TaskPriority, UserRole } from "@prisma/client"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/shadcn/ui/dialog"
import { Button } from "@/components/shadcn/ui/button"
import { Input } from "@/components/shadcn/ui/input"
import { Label } from "@/components/shadcn/ui/label"
import { Textarea } from "@/components/shadcn/ui/textarea"
import { Select as ShadcnSelect } from "@/components/shadcn/ui/select"

type UserLite = { id: string; name: string; username: string; role: UserRole }

type CurrentUser = { id: string; role: "ADMIN" | "EMPLOYEE" }

export default function CreateTaskDialog({
  open,
  onOpenChange,
  users,
  currentUser,
  onCreate
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: UserLite[]
  currentUser: CurrentUser
  onCreate: (input: { title: string; description: string | null; assignedToId: string; priority: TaskPriority }) => Promise<void>
}) {
  const canAdmin = currentUser.role === "ADMIN"

  const defaultAssignedToId = useMemo(() => {
    if (!users.length) return currentUser.id
    const current = users.find((u) => u.id === currentUser.id)?.id
    return current ?? users[0].id
  }, [currentUser.id, users])

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedToId, setAssignedToId] = useState<string>(defaultAssignedToId)
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle("")
    setDescription("")
    setAssignedToId(defaultAssignedToId)
    setPriority("MEDIUM")
    setSaving(false)
  }, [open, defaultAssignedToId])

  async function submit() {
    const t = title.trim()
    if (!t) return
    setSaving(true)
    try {
      await onCreate({
        title: t,
        description: description.trim() ? description.trim() : null,
        assignedToId: canAdmin ? assignedToId : currentUser.id,
        priority
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>Crea una tarea y quedará visible inmediatamente en el tablero.</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Actualizar contratos"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Descripción</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agrega contexto, criterios de aceptación, links…"
            />
          </div>

          {canAdmin ? (
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
          ) : null}

          {canAdmin && users.length ? (
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
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={saving}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={saving || !title.trim()}>
            {saving ? "Creando…" : "Crear tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

