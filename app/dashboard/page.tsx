import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import KanbanBoard from "@/components/KanbanBoard"

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) return null

  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true, role: true },
    orderBy: { name: "asc" }
  })

  const tasks = await prisma.task.findMany({
    include: {
      assignedUsers: { select: { id: true, name: true, username: true, role: true } },
      comments: {
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return <KanbanBoard currentUser={user} users={users} initialTasks={tasks as any} />
}