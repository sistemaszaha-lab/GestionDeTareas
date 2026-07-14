"use client"

import { useMemo, useState, type FormEvent } from "react"
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
import { MultiSelect } from "@/components/ui/MultiSelect"

type UserLite = { id: string; name: string; username: string; role: UserRole }

type CurrentUser = { id: string; role: "ADMIN" | "USER" }

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
  onCreate: (input: {
    title: string
    description: string | null
    assignedUserIds: string[]
    priority: TaskPriority
    dueDate: string | null
    tags?: string[]
  }) => Promise<void>
}) {
  const canAdmin = currentUser.role === "ADMIN"

  const defaultAssignedUserIds = useMemo(() => {
    if (!users.length) return [currentUser.id]
    const current = users.find((u) => u.id === currentUser.id)?.id
    return current ? [current] : []
  }, [currentUser.id, users])

  function createInitialState() {
    return {
      title: "",
      description: "",
      assignedUserIds: defaultAssignedUserIds,
      priority: "MEDIUM" as TaskPriority,
      dueDate: "",
      tags: "",
      saving: false
    }
  }

  const [title, setTitle] = useState(() => createInitialState().title)
  const [description, setDescription] = useState(() => createInitialState().description)
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>(() => createInitialState().assignedUserIds)
  const [priority, setPriority] = useState<TaskPriority>(() => createInitialState().priority)
  const [dueDate, setDueDate] = useState(() => createInitialState().dueDate)
  const [tags, setTags] = useState(() => createInitialState().tags)
  const [saving, setSaving] = useState(() => createInitialState().saving)

  function parseTags(input: string) {
    return input
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    const t = title.trim()
    if (!t) return
    setSaving(true)
    try {
      await onCreate({
        title: t,
        description: description.trim() ? description.trim() : null,
        assignedUserIds: canAdmin ? assignedUserIds : [currentUser.id],
        priority,
        dueDate: dueDate ? dueDate : null,
        tags: tags.trim() ? parseTags(tags) : []
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

        <form onSubmit={submit} className="px-6 pb-2 space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="task-tags">Tags</Label>
            <Input
              id="task-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="bug, urgente, cliente-x"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-due">Vence el</Label>
              <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <div className="text-xs text-slate-600 dark:text-slate-400">Opcional</div>
            </div>

            {canAdmin ? (
              <div className="space-y-2">
                <Label htmlFor="task-priority">Prioridad</Label>
                <ShadcnSelect id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                </ShadcnSelect>
              </div>
            ) : null}

            {canAdmin && users.length ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="task-assigned">Asignar a</Label>
                <MultiSelect
                  options={users}
                  selected={assignedUserIds}
                  onChange={setAssignedUserIds}
                />
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Creando…" : "Crear tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
