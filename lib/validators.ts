import { z } from "zod"

function isValidIsoDate(input: string) {
  const d = new Date(`${input}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return false
  return d.toISOString().slice(0, 10) === input
}

export const taskStatusValues = ["PENDING", "IN_PROGRESS", "DONE"] as const
export const taskPriorityValues = ["LOW", "MEDIUM", "HIGH"] as const

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
  priority: z.enum(taskPriorityValues).optional(),
  assignedUserIds: z.array(z.string().trim().min(1)),
  dueDate: isoDate.optional().nullable(),
  tags: z.array(z.string().trim().min(1)).optional()
})

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  priority: z.enum(taskPriorityValues).optional(),
  status: z.enum(taskStatusValues).optional(),
  assignedUserIds: z.array(z.string().trim().min(1)).optional(),
  dueDate: isoDate.optional().nullable(),
  tags: z.array(z.string().trim().min(1)).optional()
})

export const taskTrashBulkSchema = z.object({
  taskIds: z.array(z.string().trim().min(1)).min(1),
  columnId: z.enum(taskStatusValues)
})

export const taskRestoreBulkSchema = z.object({
  taskIds: z.array(z.string().trim().min(1)).min(1)
})

export const taskRestoreSingleSchema = z.object({
  taskId: z.string().trim().min(1),
  columnId: z.enum(taskStatusValues).optional()
})

export const taskPermanentDeleteSchema = z.object({
  taskIds: z.array(z.string().trim().min(1)).min(1)
})

export const createCommentSchema = z.object({
  taskId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(2000)
})

export const createUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    middleName: z.string().trim().max(80).optional().nullable(),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(7).max(32),
    username: z
      .string()
      .trim()
      .min(3)
      .max(64)
      .regex(/^[a-zA-Z0-9._-]+$/, "Username inválido"),
    password: z.string().min(8).max(200),
    confirmPassword: z.string().min(8).max(200),
    role: z.enum(["admin", "user", "ADMIN", "USER"]).optional()
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden"
      })
    }
  })

export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional(),
    middleName: z.string().trim().max(80).optional().nullable(),
    lastName: z.string().trim().min(1).max(80).optional(),
    email: z.string().trim().email().max(254).optional(),
    phone: z.string().trim().min(7).max(32).optional(),
    username: z
      .string()
      .trim()
      .min(3)
      .max(64)
      .regex(/^[a-zA-Z0-9._-]+$/, "Username inválido")
      .optional(),
    password: z.string().min(8).max(200).optional(),
    confirmPassword: z.string().min(8).max(200).optional(),
    role: z.enum(["admin", "user", "ADMIN", "USER"]).optional()
  })
  .superRefine((data, ctx) => {
    const hasPassword = typeof data.password === "string" && data.password.length > 0
    const hasConfirm = typeof data.confirmPassword === "string" && data.confirmPassword.length > 0

    if (hasPassword !== hasConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Confirma la contraseña"
      })
      return
    }

    if (hasPassword && data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden"
      })
    }

    const hasAny =
      data.firstName !== undefined ||
      data.middleName !== undefined ||
      data.lastName !== undefined ||
      data.email !== undefined ||
      data.phone !== undefined ||
      data.username !== undefined ||
      data.role !== undefined ||
      hasPassword

    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: "Sin cambios"
      })
    }
  })
