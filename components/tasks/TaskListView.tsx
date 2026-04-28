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

function isoDateOnly(d: string | Date | null) {
  if (!d) return ""
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function toTagsInput(tags: string[] | undefined) {
  return (tags ?? []).join(", ")
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
  const variant = status === "DONE" ? "success" : status === "IN_PROGRESS" ? "outline" : "secondary"
  return (
    <Badge variant={variant as any} className="shrink-0">
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
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Lista</CardTitle>
          {canAdmin ? (
            <div className="flex items-center gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void createInline()
                  }
                }}
                placeholder="Crear tarea…"
                className="h-9 w-[min(520px,70vw)]"
              />
              <Button size="sm" className="h-9 rounded-full px-4" onClick={() => void createInline()} disabled={!newTitle.trim() || creating}>
                {creating ? "Creando…" : "Crear"}
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} users={users} currentUser={currentUser} canAdmin={canAdmin} onUpdate={onUpdate} />
          ))}
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-400">Sin tareas</div>
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
  const [tags, setTags] = useState(toTagsInput(task.tags))
  const [saving, setSaving] = useState(false)

  useEffect(() => setTitle(task.title), [task.title])
  useEffect(() => setDueDate(isoDateOnly(task.dueDate)), [task.dueDate])
  useEffect(() => setPriority(task.priority), [task.priority])
  useEffect(() => setAssignedUserIds(task.assignedUsers.map((u) => u.id)), [task.assignedUsers])
  useEffect(() => setTags(toTagsInput(task.tags)), [task.tags])

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

  return (
    <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <input
            aria-label="Completar"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700"
            checked={isDone}
            disabled={!canEditStatus || saving}
            onChange={(e) => void save({ status: e.target.checked ? "DONE" : "PENDING" })}
          />

          <div className="min-w-0 flex-1">
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
                className={[
                  "h-9 border-transparent bg-transparent px-2 focus-visible:border-slate-200 dark:focus-visible:border-slate-800 focus-visible:bg-white dark:focus-visible:bg-slate-950/40",
                  isDone ? "line-through text-slate-500 dark:text-slate-400" : ""
                ].join(" ")}
              />
              <StatusBadge status={task.status} />
              {task.dueDate ? (
                <Badge variant="outline" className="shrink-0">
                  {isoDateOnly(task.dueDate)}
                </Badge>
              ) : null}
              {(task.tags ?? []).slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="shrink-0">
                  {tag}
                </Badge>
              ))}
              {(task.tags ?? []).length > 3 ? (
                <Badge variant="outline" className="shrink-0">
                  +{(task.tags ?? []).length - 3}
                </Badge>
              ) : null}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Vence</div>
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
                  className="h-9"
                />
              </div>

              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Prioridad</div>
                <ShadcnSelect
                  value={priority}
                  onChange={(e) => {
                    const next = e.target.value as TaskPriority
                    setPriority(next)
                    if (canEditFields) void save({ priority: next })
                  }}
                  disabled={!canEditFields || saving}
                  className="h-9"
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                </ShadcnSelect>
              </div>

              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Asignados</div>
                <MultiSelect
                  options={users}
                  selected={assignedUserIds}
                  onChange={(next) => {
                    setAssignedUserIds(next)
                    if (canEditFields) void save({ assignedUserIds: next })
                  }}
                />
              </div>

              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Tags</div>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  onBlur={() => {
                    if (!canEditFields) return
                    const next = parseTags(tags)
                    const prev = task.tags ?? []
                    if (JSON.stringify(next) !== JSON.stringify(prev)) void save({ tags: next })
                  }}
                  disabled={!canEditFields || saving}
                  placeholder="bug, urgente…"
                  className="h-9"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end md:justify-start">
        {saving ? <span className="text-xs text-slate-500 dark:text-slate-400">Guardando…</span> : null}
      </div>
    </div>
  )
}

