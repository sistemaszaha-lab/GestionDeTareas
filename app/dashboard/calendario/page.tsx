import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { taskScopeWhere } from "@/lib/task-permissions"
import CalendarClient from "./CalendarClient"

export default async function CalendarioPage() {
  const user = await getSessionUser()
  if (!user) return null

  const tasks = await prisma.task.findMany({
    where: taskScopeWhere(user),
    include: {
      assignedUsers: {
        select: { id: true, name: true, username: true, role: true }
      },
      comments: {
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { dueDate: "asc" }
  })

  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true, role: true },
    orderBy: { name: "asc" }
  })

  // Format dates cleanly for client component JSON serialization
  const formattedTasks = tasks.map(t => ({
    ...t,
    dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
    createdAt: t.createdAt.toISOString()
  }))

  return (
    <CalendarClient 
      initialTasks={formattedTasks as any} 
      users={users} 
      currentUser={user} 
    />
  )
}
