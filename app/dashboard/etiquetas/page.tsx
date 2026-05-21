import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { taskScopeWhere } from "@/lib/task-permissions"
import TagsClient from "./TagsClient"

export default async function EtiquetasPage() {
  const user = await getSessionUser()
  if (!user) return null

  const tasks = await prisma.task.findMany({
    where: taskScopeWhere(user),
    select: {
      id: true,
      tags: true,
      status: true
    }
  })

  // Normalize tasks list for serialization
  const serializedTasks = tasks.map(t => ({
    id: t.id,
    tags: t.tags ?? [],
    status: t.status
  }))

  return (
    <TagsClient initialTasks={serializedTasks} />
  )
}
