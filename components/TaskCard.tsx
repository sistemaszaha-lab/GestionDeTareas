"use client"

import type { TaskPriority, TaskStatus, UserRole } from "@prisma/client"
import { useMemo, useState } from "react"
import { Button } from "@/components/shadcn/ui/button"
import { Card, CardContent } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"
import { Input } from "@/components/shadcn/ui/input"
import { Label } from "@/components/shadcn/ui/label"
import { Select as ShadcnSelect } from "@/components/shadcn/ui/select"

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

export default function TaskCard({
  task,
  currentUser,
  users,
  onOpen,
  onQuickStatusChange,
  onQuickAssigneeChange,
  onAddComment
}: {
  task: TaskWithRelations
  currentUser: CurrentUser
  users?: UserLite[]
  onOpen: () => void
  onQuickStatusChange: (status: TaskStatus) => Promise<void> | void
  onQuickAssigneeChange?: (assignedToId: string) => Promise<void>
  onAddComment?: (content: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(task.comments.length > 0)
  const [commentText, setCommentText] = useState("")
  const [commentSending, setCommentSending] = useState(false)

  const statusOrder: TaskStatus[] = ["PENDING", "IN_PROGRESS", "DONE"]

  const canMove = useMemo(
    () => currentUser.role === "ADMIN" || task.assignedToId === currentUser.id,
    [currentUser, task.assignedToId]
  )

  const canReassign = useMemo(
    () => currentUser.role === "ADMIN" && Boolean(onQuickAssigneeChange) && Boolean(users?.length),
    [currentUser.role, onQuickAssigneeChange, users?.length]
  )

  const canComment = Boolean(onAddComment)

  const recentComments = useMemo(() => {
    const sorted = [...task.comments].sort((a, b) => {
      const at = new Date(a.createdAt).getTime()
      const bt = new Date(b.createdAt).getTime()
      return bt - at
    })
    return sorted.slice(0, 3)
  }, [task.comments])

  async function changeStatus(status: TaskStatus) {
    if (status === task.status) return
    setSaving(true)
    try {
      await onQuickStatusChange(status)
    } finally {
      setSaving(false)
    }
  }

  async function changeAssignee(assignedToId: string) {
    if (!onQuickAssigneeChange) return
    if (assignedToId === task.assignedToId) return
    setSaving(true)
    try {
      await onQuickAssigneeChange(assignedToId)
    } finally {
      setSaving(false)
    }
  }

  async function submitComment() {
    if (!onAddComment) return
    const content = commentText.trim()
    if (!content) return
    setCommentSending(true)
    try {
      await onAddComment(content)
      setCommentText("")
      setCommentsOpen(true)
    } finally {
      setCommentSending(false)
    }
  }

  const statusBadgeVariant = task.status === "DONE" ? "success" : task.status === "IN_PROGRESS" ? "default" : "secondary"
  const priorityBadgeVariant = task.priority === "HIGH" ? "danger" : task.priority === "LOW" ? "secondary" : "outline"

  const statusLabel = task.status === "PENDING" ? "Pendiente" : task.status === "IN_PROGRESS" ? "En progreso" : "Hecha"
  const priorityLabel = task.priority === "LOW" ? "Baja" : task.priority === "MEDIUM" ? "Media" : "Alta"

  return (
    <Card className="group shadow-none transition-[box-shadow,border-color] hover:border-slate-300 hover:shadow-sm">
      <CardContent className="p-4">
        <button className="w-full text-left" onClick={onOpen} type="button">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{task.title}</div>
              {task.description ? (
                <div className="mt-1 text-xs text-slate-600 line-clamp-2">{task.description}</div>
              ) : null}
            </div>
            <div className="shrink-0 text-xs text-slate-500 whitespace-nowrap">{task.comments.length} com.</div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600 truncate">Asignado: {task.assignedTo.name}</div>
            <div className="flex items-center gap-2">
              <Badge variant={priorityBadgeVariant as any}>{priorityLabel}</Badge>
              <Badge variant={statusBadgeVariant as any}>{statusLabel}</Badge>
            </div>
          </div>
        </button>

        <div className="mt-4 space-y-4">
          <div>
            <div className="text-xs font-medium text-slate-700">Estado</div>
            <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-white p-1 gap-1">
              {statusOrder.map((s) => {
                const active = s === task.status
                const label = s === "PENDING" ? "Pendiente" : s === "IN_PROGRESS" ? "En progreso" : "Hecha"
                return (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "ghost"}
                    onClick={() => changeStatus(s)}
                    disabled={!canMove || saving}
                    aria-pressed={active}
                    className={[
                      "h-7 rounded-full px-3 text-[11px] font-semibold",
                      active ? "" : "text-slate-700"
                    ].join(" ")}
                    title={canMove ? `Cambiar a ${label}` : "No puedes cambiar el estado"}
                  >
                    {label}
                  </Button>
                )
              })}
            </div>
          </div>

          {canReassign ? (
            <div className="space-y-2">
              <Label htmlFor={`assignee-${task.id}`}>Asignado a</Label>
              <ShadcnSelect
                id={`assignee-${task.id}`}
                value={task.assignedToId}
                onChange={(e) => changeAssignee(e.target.value)}
                disabled={saving}
              >
                {(users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </ShadcnSelect>
            </div>
          ) : null}

          {canComment ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-slate-700">Comentarios</div>
                <button
                  type="button"
                  className="text-xs text-slate-600 hover:text-slate-900 underline underline-offset-4"
                  onClick={() => setCommentsOpen((v) => !v)}
                >
                  {commentsOpen ? "Ocultar" : "Ver"}
                </button>
              </div>
              <Label htmlFor={`comment-${task.id}`} className="sr-only">Nuevo comentario</Label>
              <div className="flex gap-2 items-end">
                <Input
                  id={`comment-${task.id}`}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void submitComment()
                    }
                  }}
                  placeholder="Escribe un comentario…"
                  disabled={commentSending}
                />
                <Button
                  variant="outline"
                  type="button"
                  className="h-11 shrink-0"
                  onClick={submitComment}
                  disabled={!commentText.trim() || commentSending}
                >
                  {commentSending ? "Enviando…" : "Enviar"}
                </Button>
              </div>

              {commentsOpen ? (
                <div className="space-y-2">
                  {task.comments.length === 0 ? (
                    <div className="text-xs text-slate-500">Aún no hay comentarios.</div>
                  ) : (
                    recentComments.map((c) => (
                      <div key={c.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold truncate text-slate-900">{c.user.name}</div>
                          <div className="text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(c.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{c.content}</div>
                      </div>
                    ))
                  )}

                  {task.comments.length > recentComments.length ? (
                    <div className="text-[11px] text-slate-500">Mostrando los últimos {recentComments.length}.</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {!canMove && !canReassign && !canComment ? (
            <div className="text-[11px] text-slate-500">Solo el asignado o admin puede mover.</div>
          ) : null}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onOpen} size="sm">
              Ver
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}



