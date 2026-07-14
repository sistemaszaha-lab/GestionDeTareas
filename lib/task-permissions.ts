import type { Prisma } from "@prisma/client"

type Role = "ADMIN" | "USER"

export type TaskSessionUser = {
  id: string
  role: Role
}

export function isAdmin(user: TaskSessionUser) {
  return user.role === "ADMIN"
}

// Base scope for active tasks. Admin: all active tasks. User: only assigned active tasks.
export function taskScopeWhere(user: TaskSessionUser): Prisma.TaskWhereInput {
  if (isAdmin(user)) return { deletedAt: null }
  return { deletedAt: null, assignedUsers: { some: { id: user.id } } }
}

export function taskByIdWhere(user: TaskSessionUser, id: string): Prisma.TaskWhereInput {
  return { id, ...taskScopeWhere(user) }
}

export function trashedTaskScopeWhere(user: TaskSessionUser): Prisma.TaskWhereInput {
  if (isAdmin(user)) return { deletedAt: { not: null } }
  return { deletedAt: { not: null }, assignedUsers: { some: { id: user.id } } }
}

export function trashedTaskByIdWhere(user: TaskSessionUser, id: string): Prisma.TaskWhereInput {
  return { id, ...trashedTaskScopeWhere(user) }
}
