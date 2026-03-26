import { prisma } from "@/lib/prisma"
import { jsonError, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
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
  const user = await requireSession(req)
  if (!user) return jsonError("Unauthorized", 401)

  const { id } = await Promise.resolve(ctx.params)
  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) return jsonError("No encontrada", 404)

  const body = await req.json().catch(() => null)
  const parsed = updateTaskSchema.safeParse(body)
  if (!parsed.success) return jsonError("Datos inválidos", 400)

  const canEditAll = user.role === "ADMIN"
  const isAssignee = existing.assignedToId === user.id
  if (!canEditAll && !isAssignee) return jsonError("Forbidden", 403)

  const attemptedAssigneeChange = parsed.data.assignedToId && parsed.data.assignedToId !== existing.assignedToId
  const attemptedPriorityChange = parsed.data.priority && parsed.data.priority !== (existing as any).priority
  const attemptedTextChange =
    (typeof parsed.data.title === "string" && parsed.data.title !== existing.title) ||
    (typeof parsed.data.description !== "undefined" && parsed.data.description !== existing.description)
  const attemptedDueDateChange = typeof parsed.data.dueDate !== "undefined"
  if (!canEditAll && (attemptedAssigneeChange || attemptedPriorityChange || attemptedTextChange || attemptedDueDateChange)) {
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
      ...(parsed.data.assignedToId ? { assignedToId: parsed.data.assignedToId } : {}),
      ...dueDatePatch
    },
    include: {
      assignedTo: { select: { id: true, name: true, username: true, role: true } },
      comments: {
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  })

  return jsonOk({ task })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireSession(req)
  if (!user) return jsonError("Unauthorized", 401)
  if (user.role !== "ADMIN") return jsonError("Forbidden", 403)

  const { id } = await Promise.resolve(ctx.params)
  await prisma.task.delete({ where: { id } }).catch(() => null)
  return jsonOk({ ok: true })
}