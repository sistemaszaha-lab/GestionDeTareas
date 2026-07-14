import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { trashedTaskScopeWhere } from "@/lib/task-permissions"
import RecycleBinClient from "./RecycleBinClient"

function normalizeAttachments(value: unknown) {
  return Array.isArray(value) ? value : []
}

export default async function PapeleraPage() {
  const user = await getSessionUser()
  if (!user) return null
  const nowIso = new Date().toISOString()

  const tasks = await prisma.task.findMany({
    where: trashedTaskScopeWhere(user),
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      deletedAt: true,
      attachments: true,
      tags: true,
      comments: { select: { id: true } },
      deletedBy: { select: { id: true, name: true, username: true } },
      assignedUsers: { select: { id: true, name: true, username: true } }
    },
    orderBy: { deletedAt: "desc" }
  })

  const serializedTasks = tasks.map((task) => ({
    ...task,
    attachments: normalizeAttachments(task.attachments),
    tags: task.tags ?? [],
    comments: task.comments ?? []
  }))

  return <RecycleBinClient initialTasks={serializedTasks} nowIso={nowIso} />
}
