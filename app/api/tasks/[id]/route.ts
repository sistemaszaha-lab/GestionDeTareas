import { prisma } from "@/lib/prisma"
import { jsonError, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { updateTaskSchema } from "@/lib/validators"

export const runtime = "nodejs"

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const user = await requireSession(req)
  if (!user) return jsonError("Unauthorized", 401)

  const { id } = ctx.params
  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) return jsonError("No encontrada", 404)

  const body = await req.json().catch(() => null)
  const parsed = updateTaskSchema.safeParse(body)
  if (!parsed.success) return jsonError("Datos inválidos", 400)

  const canEditAll = user.role === "ADMIN"
  const isAssignee = existing.assignedToId === user.id
  if (!canEditAll && !isAssignee) return jsonError("Forbidden", 403)

  const attemptedAssigneeChange = parsed.data.assignedToId && parsed.data.assignedToId !== existing.assignedToId
  const attemptedTextChange =
    (typeof parsed.data.title === "string" && parsed.data.title !== existing.title) ||
    (typeof parsed.data.description !== "undefined" && parsed.data.description !== existing.description)

  if (!canEditAll && (attemptedAssigneeChange || attemptedTextChange)) {
    return jsonError("Solo admin puede editar título/descr. o reasignar", 403)
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
      ...(typeof parsed.data.description !== "undefined" ? { description: parsed.data.description ?? null } : {}),
      ...(parsed.data.status ? { status: parsed.data.status as any } : {}),
      ...(parsed.data.assignedToId ? { assignedToId: parsed.data.assignedToId } : {})
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      comments: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  })

  return jsonOk({ task })
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const user = await requireSession(req)
  if (!user) return jsonError("Unauthorized", 401)
  if (user.role !== "ADMIN") return jsonError("Forbidden", 403)

  const { id } = ctx.params
  await prisma.task.delete({ where: { id } }).catch(() => null)
  return jsonOk({ ok: true })
}
