import type { Prisma } from "@prisma/client"

type Role = "ADMIN" | "USER"

export type TaskSessionUser = {
  id: string
  role: Role
}

export function isAdmin(user: TaskSessionUser) {
  return user.role === "ADMIN"
}

// Base scope for any Task query. Admin: all tasks. User: only assigned tasks.
export function taskScopeWhere(user: TaskSessionUser): Prisma.TaskWhereInput {
  if (isAdmin(user)) return {}
  return { assignedUsers: { some: { id: user.id } } }
}

export function taskByIdWhere(user: TaskSessionUser, id: string): Prisma.TaskWhereInput {
  return { id, ...taskScopeWhere(user) }
}

