import { prisma } from "@/lib/prisma"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { isAdmin, taskByIdWhere } from "@/lib/task-permissions"
import { updateTaskSchema } from "@/lib/validators"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"

function parseDueDate(input: string | null): Date | null {
  if (!input) return null
  const d = new Date(`${input}T23:59:59.999Z`)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const { id } = await Promise.resolve(ctx.params)
    const existing = await prisma.task.findFirst({
      where: taskByIdWhere(user, id),
      include: { assignedUsers: { select: { id: true } } }
    })
    if (!existing) return jsonError("No encontrada", 404)

    const body = await req.json().catch(() => null)
    const parsed = updateTaskSchema.safeParse(body)
    if (!parsed.success) return jsonError("Datos inválidos", 400)

    const canEditAll = isAdmin(user)
    const isAssignee = existing.assignedUsers.some((u: any) => u.id === user.id)
    // NOTE: `existing` is already scoped for USER, but keep this guard for safety.
    if (!canEditAll && !isAssignee) return jsonError("Forbidden", 403)

    const attemptedAssigneeChange = parsed.data.assignedUserIds && JSON.stringify(parsed.data.assignedUserIds.sort()) !== JSON.stringify(existing.assignedUsers.map((u: any) => u.id).sort())
    const attemptedPriorityChange = parsed.data.priority && parsed.data.priority !== (existing as any).priority
    const attemptedTextChange =
      (typeof parsed.data.title === "string" && parsed.data.title !== existing.title) ||
      (typeof parsed.data.description !== "undefined" && parsed.data.description !== existing.description)
    const attemptedDueDateChange = typeof parsed.data.dueDate !== "undefined"
    const attemptedTagsChange =
      typeof parsed.data.tags !== "undefined" && JSON.stringify(parsed.data.tags ?? []) !== JSON.stringify((existing as any).tags ?? [])
    if (!canEditAll && (attemptedAssigneeChange || attemptedPriorityChange || attemptedTextChange || attemptedDueDateChange || attemptedTagsChange)) {
      return jsonError("Solo admin puede editar título/descr., prioridad, vencimiento o reasignar", 403)
    }

    const dueDatePatch =
      typeof parsed.data.dueDate === "undefined" ? {} : { dueDate: parseDueDate(parsed.data.dueDate ?? null) }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        ...(typeof parsed.data.description !== "undefined" ? { description: parsed.data.description ?? null } : {}),
        ...(parsed.data.status ? { status: parsed.data.status as any } : {}),
        ...(parsed.data.priority ? { priority: parsed.data.priority as any } : {}),
        ...(parsed.data.assignedUserIds ? { assignedUsers: { set: parsed.data.assignedUserIds.map(id => ({ id })) } } : {}),
        ...dueDatePatch,
        ...(typeof parsed.data.tags !== "undefined" ? { tags: parsed.data.tags ?? [] } : {})
      },
      include: {
        assignedUsers: { select: { id: true, name: true, username: true, role: true } },
        comments: {
          include: { user: { select: { id: true, name: true, username: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    })

    return jsonOk({ task })
  } catch (err) {
    return jsonException(err, { route: "PATCH /api/tasks/:id" })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)
    if (user.role !== "ADMIN") return jsonError("Forbidden", 403)

    const { id } = await Promise.resolve(ctx.params)
    await prisma.task.delete({ where: { id } }).catch(() => null)
    return jsonOk({ ok: true })
  } catch (err) {
    return jsonException(err, { route: "DELETE /api/tasks/:id" })
  }
}
