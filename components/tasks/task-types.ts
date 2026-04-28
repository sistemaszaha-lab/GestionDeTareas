import type { TaskPriority, TaskStatus, UserRole } from "@prisma/client"

export type UserLite = { id: string; name: string; username: string; role: UserRole }

export type CommentWithUser = {
  id: string
  content: string
  createdAt: string | Date
  user: { id: string; name: string; username: string }
}

export type Attachment = {
  id: string
  name: string
  url: string
  type: "file" | "link"
  fileType?: string
  createdAt: string
}

export type TaskWithRelations = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignedToId: string
  dueDate: string | Date | null
  createdAt: string | Date
  assignedTo: UserLite
  comments: CommentWithUser[]
  tags?: string[]
  attachments?: Attachment[] | null
}

export type CurrentUser = { id: string; name: string; username: string; role: "ADMIN" | "USER" }

