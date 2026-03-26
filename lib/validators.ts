import { z } from "zod"

function isValidIsoDate(input: string) {
  const d = new Date(`${input}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return false
  return d.toISOString().slice(0, 10) === input
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidIsoDate, "Fecha inválida")

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1)
})

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  assignedToId: z.string().trim().min(1),
  dueDate: isoDate.optional().nullable()
})

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]).optional(),
  assignedToId: z.string().trim().min(1).optional(),
  dueDate: isoDate.optional().nullable()
})

export const createCommentSchema = z.object({
  taskId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(2000)
})
