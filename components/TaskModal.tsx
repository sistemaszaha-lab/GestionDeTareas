"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
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
import { 
  Paperclip, 
  Link2, 
  Calendar, 
  AlertCircle, 
  Trash2, 
  Save, 
  MessageSquare, 
  Send, 
  FileText, 
  Image as ImageIcon, 
  File as FileIcon,
  Clock,
  UserPlus
} from "lucide-react"

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
  const [filesToUpload, setFilesToUpload] = useState<File[]>([])
  const [linkUrl, setLinkUrl] = useState("")
  const [linkName, setLinkName] = useState("")
  const [attaching, setAttaching] = useState(false)

  useEffect(() => {
    if (!open) return
    setUploadMode(null)
    setFilesToUpload([])
    setLinkUrl("")
    setLinkName("")
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
    if (!confirm("¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.")) return
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
    if (uploadMode === "file" && filesToUpload.length === 0) return
    if (uploadMode === "link" && (!linkUrl || !linkName)) return

    setAttaching(true)
    try {
      const formData = new FormData()
      if (uploadMode === "file" && filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          formData.append("files", file)
        }
      } else {
        formData.append("url", linkUrl)
        formData.append("name", linkName)
      }
      await props.onAddAttachment(task.id, formData)
      setFilesToUpload([])
      setLinkUrl("")
      setLinkName("")
      setUploadMode(null)
      toast.success("Archivo adjunto guardado")
    } catch(e) {
      toast.error("Error al guardar archivo")
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
      toast.success("Archivo adjunto eliminado")
    } catch(e) {
      toast.error("Error al eliminar")
    } finally {
      setAttaching(true)
    }
  }

  const modalTitle = mode === "create" ? "Nueva tarea" : "Detalle de tarea"

  const dueDateObj = dueDate ? dueDateToDate(dueDate) : null
  const isOverdue = Boolean(dueDateObj && status !== "DONE" && dueDateObj.getTime() < Date.now())

  // Styles maps
  const priorityStyles = {
    HIGH: "bg-rose-50 text-[#EF4444] border-rose-100 dark:bg-rose-950/20 dark:text-rose-450",
    MEDIUM: "bg-amber-50 text-[#F59E0B] border-amber-100 dark:bg-amber-950/20 dark:text-amber-450",
    LOW: "bg-[#3F9EA2]/10 text-[#3F9EA2] border-[#3F9EA2]/20 dark:bg-[#3F9EA2]/5"
  }

  const priorityLabel = {
    HIGH: "Prioridad Alta",
    MEDIUM: "Prioridad Media",
    LOW: "Prioridad Baja"
  }[priority]

  const statusStyles = {
    PENDING: "bg-[#3F9EA2]/15 text-[#3F9EA2] dark:bg-[#3F9EA2]/10",
    IN_PROGRESS: "bg-[#016B6B]/15 text-[#016B6B] dark:bg-[#3F9EA2]/10 dark:text-[#3F9EA2]",
    DONE: "bg-[#22C55E]/15 text-[#22C55E] dark:bg-[#22C55E]/10"
  }

  const statusLabel = {
    PENDING: "Pendiente",
    IN_PROGRESS: "En progreso",
    DONE: "Completada"
  }[status]

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="max-w-2xl rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-[#1C1D1D] p-5 md:p-6 overflow-y-auto max-h-[92vh]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-poppins font-black text-xl text-slate-800 dark:text-[#F8FAFA] tracking-tight">
            {modalTitle}
          </DialogTitle>
          {mode === "create" ? (
            <DialogDescription className="text-xs text-slate-500">
              Registra los detalles iniciales para que la tarea aparezca en el panel de control.
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {mode === "create" ? (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="task-title" className="text-xs font-semibold text-slate-500">Título de la tarea</Label>
                <Input 
                  id="task-title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Ej. Rediseñar panel de control..."
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="task-description" className="text-xs font-semibold text-slate-500">Descripción u objetivos</Label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalla los requisitos de la tarea, enlaces o notas..."
                  className="rounded-xl min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-priority" className="text-xs font-semibold text-slate-500">Prioridad</Label>
                <ShadcnSelect id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="h-10 rounded-xl">
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                </ShadcnSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-due" className="text-xs font-semibold text-slate-500">Fecha límite</Label>
                <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10 rounded-xl" />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="task-assigned" className="text-xs font-semibold text-slate-500">Miembros asignados</Label>
                <MultiSelect
                  options={users}
                  selected={assignedUserIds}
                  onChange={setAssignedUserIds}
                  placeholder="Selecciona uno o más encargados..."
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={saving}
                className="h-10 rounded-xl border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 font-poppins text-xs font-medium"
              >
                Cancelar
              </Button>
              <Button 
                onClick={create} 
                disabled={saving || !title.trim()}
                className="h-10 rounded-xl bg-[#016B6B] hover:bg-[#3F9EA2] text-white active:scale-[0.98] transition-all font-poppins text-xs font-semibold px-5 shadow-sm shadow-[#016B6B]/15"
              >
                {saving ? "Creando…" : "Crear Tarea"}
              </Button>
            </DialogFooter>
          </div>
        ) : task ? (
          <div className="space-y-5 pt-1">
            
            {/* Action Meta Info Header */}
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <Badge className={cn("text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border-0 shadow-none", priorityStyles[priority])}>
                {priorityLabel}
              </Badge>
              <Badge className={cn("text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border-0 shadow-none", statusStyles[status])}>
                {statusLabel}
              </Badge>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 ml-1" />
              
              <div className="flex -space-x-1.5 overflow-hidden ml-1">
                {task.assignedUsers.map((u) => (
                  <div
                    key={u.id}
                    title={u.name}
                    className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#1C1D1D] bg-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-300 flex items-center justify-center text-[9px] font-bold uppercase"
                  >
                    {u.name.slice(0, 2)}
                  </div>
                ))}
              </div>
              
              <span className="text-[11px] font-medium text-slate-500">
                {task.assignedUsers.length > 0 ? (
                  <span>Asignados: {task.assignedUsers.map(u => u.name).join(", ")}</span>
                ) : (
                  <span className="text-amber-500 font-semibold flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Sin asignar</span>
                )}
              </span>

              {dueDateObj ? (
                <span
                  className={cn(
                    "text-[11px] font-semibold flex items-center gap-1 ml-auto",
                    isOverdue ? "text-rose-600 dark:text-rose-450" : "text-slate-500"
                  )}
                >
                  {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3.5 w-3.5" />}
                  <span>{isOverdue ? "Vencida el: " : "Vence el: "} {dueDateObj.toLocaleDateString("es-MX")}</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 ml-auto">Sin fecha límite</span>
              )}
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="detail-title" className="text-xs font-semibold text-slate-500">Título de la tarea</Label>
                <Input 
                  id="detail-title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  disabled={!canAdmin}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="detail-assigned" className="text-xs font-semibold text-slate-500">Miembros asignados</Label>
                <div className={!canAdmin ? "pointer-events-none opacity-60" : ""}>
                  <MultiSelect
                    options={users}
                    selected={assignedUserIds}
                    onChange={setAssignedUserIds}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="detail-status" className="text-xs font-semibold text-slate-500">Estado actual</Label>
                <ShadcnSelect
                  id="detail-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  disabled={!canEditStatus}
                  className="h-10 rounded-xl"
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="IN_PROGRESS">En progreso</option>
                  <option value="DONE">Completada</option>
                </ShadcnSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="detail-priority" className="text-xs font-semibold text-slate-500">Prioridad</Label>
                <ShadcnSelect
                  id="detail-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  disabled={!canAdmin}
                  className="h-10 rounded-xl"
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                </ShadcnSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="detail-due" className="text-xs font-semibold text-slate-500">Modificar Vencimiento</Label>
                <Input
                  id="detail-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!canAdmin}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="detail-description" className="text-xs font-semibold text-slate-500">Descripción detallada</Label>
                <Textarea
                  id="detail-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canAdmin}
                  className="rounded-xl min-h-[90px] resize-none"
                />
              </div>
            </div>

            {/* Attachments Section */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>Archivos adjuntos</span>
                </div>
                {!uploadMode && canEditStatus ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setUploadMode("file")}
                      className="h-8 rounded-lg text-[10px] font-bold border-slate-200 dark:border-slate-800 hover:bg-[#016B6B]/5 hover:text-[#016B6B]"
                    >
                      Subir archivo
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setUploadMode("link")}
                      className="h-8 rounded-lg text-[10px] font-bold border-slate-200 dark:border-slate-800 hover:bg-[#016B6B]/5 hover:text-[#016B6B]"
                    >
                      Añadir enlace
                    </Button>
                  </div>
                ) : null}
              </div>

              {uploadMode === "file" ? (
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-3.5 space-y-3 bg-slate-50/50 dark:bg-slate-900/10">
                  <Label className="text-xs font-medium text-slate-500">Seleccionar uno o varios archivos (Máx 5MB c/u)</Label>
                  <Input type="file" multiple onChange={(e) => setFilesToUpload(Array.from(e.target.files ?? []))} className="h-9.5 text-xs" />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setUploadMode(null); setFilesToUpload([]) }} className="h-8 rounded-lg text-xs font-semibold">Cancelar</Button>
                    <Button size="sm" onClick={addAttachment} disabled={filesToUpload.length === 0 || attaching} className="h-8 rounded-lg bg-[#016B6B] hover:bg-[#3F9EA2] text-white text-xs font-semibold px-4">
                      {attaching ? "Subiendo..." : "Subir"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {uploadMode === "link" ? (
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-3.5 space-y-3 bg-slate-50/50 dark:bg-slate-900/10">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Dirección URL</Label>
                    <Input placeholder="https://ejemplo.com/recurso" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Nombre identificador</Label>
                    <Input placeholder="Ej. Diseño Figma" value={linkName} onChange={(e) => setLinkName(e.target.value)} className="h-9 text-xs" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setUploadMode(null); setLinkUrl(""); setLinkName("") }} className="h-8 rounded-lg text-xs font-semibold">Cancelar</Button>
                    <Button size="sm" onClick={addAttachment} disabled={!linkUrl || !linkName || attaching} className="h-8 rounded-lg bg-[#016B6B] hover:bg-[#3F9EA2] text-white text-xs font-semibold px-4">
                      {attaching ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(!task.attachments || task.attachments.length === 0) && !uploadMode ? (
                  <div className="text-xs text-slate-400 text-center py-4 bg-slate-50/30 border border-dashed border-slate-200 rounded-xl col-span-2 dark:border-slate-800/40">
                    No hay archivos adjuntos en esta tarea.
                  </div>
                ) : (
                  (task.attachments || []).map((att: Attachment) => {
                    const isImg = att.fileType?.includes("image")
                    const isPdf = att.fileType?.includes("pdf")
                    const Icon = att.type === "link" ? Link2 : isPdf ? FileText : isImg ? ImageIcon : FileIcon

                    return (
                      <div key={att.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/30 transition-colors hover:border-[#016B6B]/20">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#016B6B] dark:bg-slate-800/60 dark:text-[#3F9EA2]">
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <a 
                              href={att.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs font-bold hover:text-[#016B6B] dark:hover:text-[#3F9EA2] truncate block"
                            >
                              {att.name}
                            </a>
                            <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{att.type}</div>
                          </div>
                        </div>
                        {canEditStatus ? (
                          <button 
                            onClick={() => removeAttachment(att.id)} 
                            disabled={attaching} 
                            className="text-slate-400 hover:text-rose-500 p-1 bg-transparent border-0 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Comments Feed Area */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Comentarios ({task.comments.length})</span>
              </div>
              
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200/70 bg-slate-50/40 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-950/20">
                {task.comments.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-6">Aún no hay comentarios. Escribe uno abajo para iniciar la conversación.</div>
                ) : (
                  task.comments.map((c) => (
                    <Card key={c.id} className="border-0 shadow-none bg-white dark:bg-[#1C1D1D] rounded-xl border border-slate-200/50 dark:border-slate-800/40">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-bold text-[#016B6B] dark:text-[#3F9EA2]">{c.user.name}</div>
                          <div className="text-[9px] text-slate-400 font-semibold">
                            {new Date(c.createdAt).toLocaleDateString("es-MX", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">
                          {c.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Add comment input */}
              <div className="flex gap-2 items-center">
                <Input
                  id="new-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Agregar un comentario público..."
                  className="h-10 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      void addComment()
                    }
                  }}
                />
                <Button 
                  onClick={addComment} 
                  disabled={saving || !comment.trim()} 
                  className="h-10 rounded-xl bg-slate-100 hover:bg-[#016B6B] hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#3F9EA2] dark:hover:text-white shrink-0 font-semibold text-xs px-4"
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  <span>Enviar</span>
                </Button>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                {canAdmin && (
                  <Button 
                    variant="ghost" 
                    onClick={remove} 
                    disabled={deleting} 
                    className="h-9 px-3.5 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 font-poppins font-medium text-xs flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Eliminar tarea</span>
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={onClose} 
                  disabled={saving}
                  className="h-9.5 px-4 rounded-xl border-slate-200 hover:bg-slate-50 dark:border-slate-850 dark:hover:bg-slate-900 font-poppins text-xs font-semibold"
                >
                  Cerrar
                </Button>
                <Button 
                  onClick={save} 
                  disabled={saving} 
                  className="h-9.5 px-5 rounded-xl bg-[#016B6B] hover:bg-[#3F9EA2] text-white font-poppins text-xs font-bold shadow-md shadow-[#016B6B]/10 flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? "Guardando..." : "Guardar cambios"}</span>
                </Button>
              </div>
            </div>

          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
