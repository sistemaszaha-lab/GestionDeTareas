import { prisma } from "@/lib/prisma"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { moveTasksToTrash } from "@/lib/task-trash"
import { taskTrashBulkSchema } from "@/lib/validators"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const tasks = await prisma.task.findMany({
      where: {
        deletedAt: { not: null },
        ...(user.role === "ADMIN" ? {} : { assignedUsers: { some: { id: user.id } } })
      },
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
        deletedBy: { select: { id: true, name: true, username: true } },
        assignedUsers: { select: { id: true, name: true, username: true } },
        comments: { select: { id: true } }
      },
      orderBy: { deletedAt: "desc" }
    })

    return jsonOk({ tasks })
  } catch (err) {
    return jsonException(err, { route: "GET /api/tasks/trash" })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const body = await req.json().catch(() => null)
    const parsed = taskTrashBulkSchema.safeParse(body)
    if (!parsed.success) return jsonError("Datos inválidos", 400)

    const deletedAt = await moveTasksToTrash({
      user,
      taskIds: parsed.data.taskIds,
      columnId: parsed.data.columnId
    })

    return jsonOk({ ok: true, deletedAt })
  } catch (err) {
    return jsonException(err, { route: "POST /api/tasks/trash" })
  }
}
