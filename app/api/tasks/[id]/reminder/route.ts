import { prisma } from "@/lib/prisma"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const { id } = await Promise.resolve(ctx.params)
    const existing = await prisma.task.findUnique({
      where: { id },
      include: { assignedUsers: { select: { id: true } } }
    })

    if (!existing) return jsonError("Tarea no encontrada", 404)

    // Check permissions: Admin or assigned user
    const canUpdate = user.role === "ADMIN" || existing.assignedUsers.some(u => u.id === user.id)
    if (!canUpdate) return jsonError("Forbidden", 403)

    const task = await prisma.task.update({
      where: { id },
      data: { reminderSent: true },
      include: {
        assignedUsers: { select: { id: true, name: true, username: true, role: true } }
      }
    })

    return jsonOk({ task })
  } catch (err) {
    return jsonException(err, { route: "PATCH /api/tasks/:id/reminder" })
  }
}
