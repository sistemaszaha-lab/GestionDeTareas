"use client"

import type { TaskStatus, UserRole } from "@prisma/client"
import { useMemo, useState } from "react"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"

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

  return (
    <div className="rounded-lg border border-border bg-bg shadow-sm p-3">
      <button className="w-full text-left" onClick={onOpen} type="button">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{task.title}</div>
            {task.description ? <div className="mt-1 text-xs text-fg-muted line-clamp-2">{task.description}</div> : null}
          </div>
          <div className="text-xs text-fg-muted whitespace-nowrap">{task.comments.length} com.</div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-xs text-fg-muted truncate">Asignado: {task.assignedTo.name}</div>
          <span className="text-[11px] rounded-full border border-border px-2 py-0.5 text-fg-muted">{task.status}</span>
        </div>
      </button>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-fg-muted">Estado</div>
          <div className="mt-2 inline-flex rounded-full border border-border bg-card p-1 gap-1">
            {statusOrder.map((s) => {
              const active = s === task.status
              const label = s === "PENDING" ? "Pending" : s === "IN_PROGRESS" ? "In progress" : "Done"
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeStatus(s)}
                  disabled={!canMove || saving}
                  aria-pressed={active}
                  className={[
                    "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    active
                      ? "bg-primary text-white"
                      : "bg-transparent text-fg-muted hover:bg-bg-subtle hover:text-fg",
                    !canMove || saving ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  ].join(" ")}
                  title={canMove ? `Cambiar a ${label}` : "No puedes cambiar el estado"}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {canReassign ? (
            <label className="block mt-3">
              <span className="text-xs font-medium text-fg-muted">Asignado a</span>
              <select
                value={task.assignedToId}
                onChange={(e) => changeAssignee(e.target.value)}
                disabled={saving}
                className="mt-2 h-[42px] w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                {(users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {canComment ? (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-fg-muted">Comentarios</div>
                <button
                  type="button"
                  className="text-xs text-fg-muted hover:text-fg underline underline-offset-4"
                  onClick={() => setCommentsOpen((v) => !v)}
                >
                  {commentsOpen ? "Ocultar" : "Ver"}
                </button>
              </div>

              <div className="mt-2 flex gap-2 items-end">
                <Input
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
                  className="mt-0"
                />
                <Button
                  variant="ghost"
                  type="button"
                  className="h-[42px] shrink-0"
                  onClick={submitComment}
                  loading={commentSending}
                  disabled={!commentText.trim() || commentSending}
                >
                  Enviar
                </Button>
              </div>

              {commentsOpen ? (
                <div className="mt-3 space-y-2">
                  {task.comments.length === 0 ? (
                    <div className="text-xs text-fg-muted">Aún no hay comentarios.</div>
                  ) : (
                    recentComments.map((c) => (
                      <div key={c.id} className="rounded-lg border border-border bg-card px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold truncate">{c.user.name}</div>
                          <div className="text-[11px] text-fg-muted whitespace-nowrap">
                            {new Date(c.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-1 text-sm whitespace-pre-wrap">{c.content}</div>
                      </div>
                    ))
                  )}

                  {task.comments.length > recentComments.length ? (
                    <div className="text-[11px] text-fg-muted">Mostrando los últimos {recentComments.length}.</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {!canMove && !canReassign && !canComment ? (
            <div className="mt-2 text-[11px] text-fg-muted">Solo el asignado o admin puede mover.</div>
          ) : null}
        </div>

        <Button variant="ghost" onClick={onOpen} className="h-[42px] shrink-0" type="button">
          Ver
        </Button>
      </div>
    </div>
  )
}
