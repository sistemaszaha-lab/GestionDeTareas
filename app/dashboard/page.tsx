import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { taskScopeWhere } from "@/lib/task-permissions"
import KanbanBoard from "@/components/KanbanBoard"
import type { TaskStatus } from "@prisma/client"

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) return null

  const isUserDaily = user.role === "USER"

  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true, role: true },
    orderBy: { name: "asc" }
  })

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  const tasks = await prisma.task.findMany({
    where: isUserDaily
      ? {
          assignedUsers: { some: { id: user.id } },
          dueDate: { gte: startOfToday, lte: endOfToday },
          status: { in: ["PENDING", "IN_PROGRESS"] as TaskStatus[] }
        }
      : taskScopeWhere(user),
    include: {
      assignedUsers: { select: { id: true, name: true, username: true, role: true } },
      comments: {
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return (
    <KanbanBoard
      currentUser={user}
      users={isUserDaily ? [] : users}
      initialTasks={tasks as any}
      forceUserId={isUserDaily ? user.id : undefined}
      dashboardMode={isUserDaily ? "userDaily" : "default"}
      pageTitle={isUserDaily ? "Resumen de hoy" : undefined}
      emptyState={
        isUserDaily
          ? {
              title: "Sin tareas urgentes hoy",
              description: "No tienes tareas pendientes o en progreso que venzan hoy."
            }
          : undefined
      }
    />
  )
}
