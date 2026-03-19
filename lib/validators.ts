import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  assignedToId: z.string().min(1)
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]).optional(),
  assignedToId: z.string().min(1).optional()
})

export const createCommentSchema = z.object({
  taskId: z.string().min(1),
  content: z.string().min(1).max(2000)
})

