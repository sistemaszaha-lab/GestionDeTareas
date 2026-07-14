"use client"

import type { TaskPriority, TaskStatus, UserRole } from "@prisma/client"
import { useMemo, useState } from "react"
import toast from "react-hot-toast"
import { Button } from "@/components/shadcn/ui/button"
import { Card, CardContent } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"
import { Input } from "@/components/shadcn/ui/input"
import { Label } from "@/components/shadcn/ui/label"
import { cn } from "@/lib/ui"
import { 
  Calendar, 
  Clock, 
  MessageSquare, 
  Paperclip, 
  ChevronRight, 
  Send, 
  AlertCircle
} from "lucide-react"

function getCurrentTimestamp() {
  return new Date().getTime()
}

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
  dueDate: string | Date | null
  assignedUsers: UserLite[]
  comments: CommentWithUser[]
  attachments?: any[] | null
}

type CurrentUser = { id: string; role: "ADMIN" | "USER" }

function formatDueDate(value: string | Date) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("es-MX", { day: '2-digit', month: 'short' })
}

export default function TaskCard({
  task,
  currentUser,
  users,
  onOpen,
  onQuickStatusChange,
  onAddComment,
  selectionMode = false,
  selected = false,
  onSelectionChange
}: {
  task: TaskWithRelations
  currentUser: CurrentUser
  users?: UserLite[]
  onOpen: () => void
  onQuickStatusChange: (status: TaskStatus) => Promise<void> | void
  onQuickAssigneeChange?: (assignedToId: string) => Promise<void>
  onAddComment?: (content: string) => Promise<void>
  selectionMode?: boolean
  selected?: boolean
  onSelectionChange?: (next: boolean) => void
}) {
  const [saving, setSaving] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentSending, setCommentSending] = useState(false)

  const statusOrder: TaskStatus[] = ["PENDING", "IN_PROGRESS", "DONE"]

  const canMove = useMemo(
    () => currentUser.role === "ADMIN" || task.assignedUsers.some((u) => u.id === currentUser.id),
    [currentUser, task.assignedUsers]
  )

  const canComment = Boolean(onAddComment)

  const recentComments = useMemo(() => {
    const sorted = [...task.comments].sort((a, b) => {
      const at = new Date(a.createdAt).getTime()
      const bt = new Date(b.createdAt).getTime()
      return bt - at
    })
    return sorted.slice(0, 2)
  }, [task.comments])

  async function changeStatus(status: TaskStatus) {
    if (status === task.status) return
    setSaving(true)
    try {
      await onQuickStatusChange(status)
      toast.success("Estado de tarea actualizado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
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
      toast.success("Comentario agregado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setCommentSending(false)
    }
  }

  const dueLabel = task.dueDate ? formatDueDate(task.dueDate) : null
  const dueTime = task.dueDate ? new Date(task.dueDate).getTime() : null
  const isOverdue = Boolean(dueTime && task.status !== "DONE" && dueTime < getCurrentTimestamp())

  // Priority Styles mapping
  const priorityStyles = {
    HIGH: "bg-rose-50 text-[#EF4444] border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
    MEDIUM: "bg-amber-50 text-[#F59E0B] border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
    LOW: "bg-[#3F9EA2]/10 text-[#3F9EA2] border-[#3F9EA2]/20 dark:bg-[#3F9EA2]/5 dark:text-[#3F9EA2] dark:border-[#3F9EA2]/10"
  }

  const priorityLabel = {
    HIGH: "Alta",
    MEDIUM: "Media",
    LOW: "Baja"
  }[task.priority]

  // Status Styles mapping
  const statusStyles = {
    PENDING: "bg-[#3F9EA2]/15 text-[#3F9EA2] dark:bg-[#3F9EA2]/10",
    IN_PROGRESS: "bg-[#016B6B]/15 text-[#016B6B] dark:bg-[#3F9EA2]/10 dark:text-[#3F9EA2]",
    DONE: "bg-[#22C55E]/15 text-[#22C55E] dark:bg-[#22C55E]/10"
  }

  const statusLabel = {
    PENDING: "Pendiente",
    IN_PROGRESS: "En progreso",
    DONE: "Completada"
  }[task.status]

  return (
    <Card
      className={cn(
        "group border border-slate-200/60 bg-white dark:border-slate-850 dark:bg-[#1C1D1D] shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700/80",
        isOverdue ? "border-rose-250 dark:border-rose-950/50 bg-rose-50/10 dark:bg-rose-950/5" : "",
        selected ? "ring-2 ring-[#016B6B] dark:ring-[#3F9EA2]" : ""
      )}
    >
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-2">
          {selectionMode ? (
            <input
              aria-label={`Seleccionar tarea ${task.title}`}
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelectionChange?.(e.target.checked)}
              className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-[#016B6B] focus:ring-[#016B6B] accent-[#016B6B]"
            />
          ) : null}

          {/* Title and Description */}
          <button className="w-full text-left focus:outline-none" onClick={selectionMode ? undefined : onOpen} type="button" disabled={selectionMode}>
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-poppins font-black text-slate-800 dark:text-slate-100 group-hover:text-[#016B6B] dark:group-hover:text-[#3F9EA2] transition-colors line-clamp-2">
                {task.title}
              </span>
              <span className="shrink-0 flex gap-2 text-[10px] font-bold text-slate-400">
                {task.attachments?.length ? (
                  <span className="flex items-center gap-0.5" title={`${task.attachments.length} adjuntos`}>
                    <Paperclip className="h-3 w-3" />
                    {task.attachments.length}
                  </span>
                ) : null}
                <span className="flex items-center gap-0.5" title={`${task.comments.length} comentarios`}>
                  <MessageSquare className="h-3 w-3" />
                  {task.comments.length}
                </span>
              </span>
            </div>

            {task.description ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            ) : null}
          </div>

          {/* User avatars & Date */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/65">
            
            {/* Assignees initials list */}
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5 overflow-hidden">
                {task.assignedUsers.map((u) => (
                  <div
                    key={u.id}
                    title={u.name}
                    className="inline-flex h-6 w-6 rounded-full items-center justify-center bg-slate-200 text-slate-700 ring-2 ring-white dark:ring-[#1C1D1D] dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold uppercase"
                  >
                    {u.name.slice(0, 2)}
                  </div>
                ))}
                {task.assignedUsers.length === 0 && (
                   <div className="h-6 w-6 rounded-full border border-dashed border-slate-300 dark:border-slate-700 bg-transparent flex items-center justify-center text-[9px] text-slate-400 font-semibold" title="Sin asignar">
                     ?
                   </div>
                )}
              </div>
              
              <div className="flex flex-col">
                {dueLabel ? (
                  <span className={cn(
                    "text-[10px] font-semibold flex items-center gap-1",
                    isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
                  )}>
                    {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    <span>{dueLabel}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Sin plazo</span>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5">
              <Badge className={cn("text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border-0 shadow-none", priorityStyles[task.priority])}>
                {priorityLabel}
              </Badge>
              <Badge className={cn("text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border-0 shadow-none", statusStyles[task.status])}>
                {statusLabel}
              </Badge>
            </div>

          </div>
        </button>
        </div>

        {/* Dynamic segmented controllers */}
        <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800/65">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cambiar Estado</span>
            <button
              type="button"
              className="text-[10px] font-semibold text-[#016B6B] dark:text-[#3F9EA2] hover:underline"
              disabled={selectionMode}
              onClick={() => setCommentsOpen(!commentsOpen)}
            >
              {commentsOpen ? "Ocultar Comentarios" : `Comentarios (${task.comments.length})`}
            </button>
          </div>

          <div className="flex rounded-lg border border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#121313]/30 p-0.5 gap-0.5">
            {statusOrder.map((s) => {
              const active = s === task.status
              const label = s === "PENDING" ? "Pendiente" : s === "IN_PROGRESS" ? "Progreso" : "Hecha"
              
              // Colored backgrounds for active buttons
              const activeBg = 
                s === "PENDING" ? "bg-[#3F9EA2] text-white hover:bg-[#3F9EA2]/90" : 
                s === "IN_PROGRESS" ? "bg-[#016B6B] text-white hover:bg-[#016B6B]/90" : 
                "bg-[#22C55E] text-white hover:bg-[#22C55E]/90"

              return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeStatus(s)}
                    disabled={!canMove || saving || selectionMode}
                    className={cn(
                      "flex-1 text-center py-1 text-[10px] font-bold rounded-md transition-all duration-200",
                      active 
                      ? `${activeBg} shadow-sm` 
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-850/40"
                  )}
                  title={canMove ? `Mover a ${label}` : "No autorizado"}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Quick Comments input popup inside Card */}
          {commentsOpen && !selectionMode && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
              
              {/* Quick comments feed */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {task.comments.length === 0 ? (
                  <div className="text-[10px] text-slate-400 text-center py-2">Sin comentarios aún.</div>
                ) : (
                  recentComments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-2 text-xs border border-slate-100 dark:border-slate-800/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#464747] dark:text-slate-300 text-[10px]">{c.user.name}</span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString("es-MX")}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment input */}
              {canComment && (
                <div className="flex gap-1.5 items-center">
                  <Input
                    className="h-8 text-xs rounded-lg min-w-0 flex-1 px-2.5 py-1"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        void submitComment()
                      }
                    }}
                    placeholder="Escribe un comentario..."
                    disabled={commentSending}
                  />
                  <Button
                    variant="outline"
                    type="button"
                    size="sm"
                    className="h-8 w-8 px-0 shrink-0 rounded-lg hover:border-[#016B6B]/40 hover:text-[#016B6B]"
                    onClick={submitComment}
                    disabled={!commentText.trim() || commentSending}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

            </div>
          )}

          {/* Action Row */}
            <div className="flex justify-end pt-1">
              <Button 
                variant="ghost" 
                onClick={selectionMode ? undefined : onOpen} 
                size="sm"
                disabled={selectionMode}
                className="h-7 text-xs font-semibold text-slate-500 hover:text-[#016B6B] dark:hover:text-[#3F9EA2] flex items-center gap-1 group/btn"
              >
              <span>Detalles</span>
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}
