import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import KanbanBoard from "@/components/KanbanBoard"

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) return null

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" }
  })

  return <KanbanBoard currentUser={user} users={users} initialTasks={[]} />
}
