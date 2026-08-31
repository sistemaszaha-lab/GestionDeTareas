import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import KanbanBoard from "@/components/KanbanBoard"

export default async function MisTareasPage() {
  const user = await getSessionUser()
  if (!user) return null

  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true, role: true },
    orderBy: { name: "asc" }
  })

  const tasks = await prisma.task.findMany({
    where: { deletedAt: null, assignedUsers: { some: { id: user.id } } },
    include: {
      assignedUsers: { select: { id: true, name: true, username: true, role: true } },
      comments: {
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  const notes = await prisma.note.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" }
  })

  // Date objects must be stringified for Client Components
  const serializedNotes = notes.map((note) => ({
    ...note,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    deletedAt: note.deletedAt?.toISOString() || null
  }))

  return <KanbanBoard currentUser={user} users={users} initialTasks={tasks as any} forceUserId={user.id} pageTitle="Mis tareas" initialNotes={serializedNotes as any} />
}
