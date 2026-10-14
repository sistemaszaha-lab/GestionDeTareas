import { prisma } from "@/lib/prisma"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { updateCommentSchema } from "@/lib/validators"

export const runtime = "nodejs"
async function getComment(id: string) { return prisma.comment.findUnique({ where: { id }, include: { user: { select: { id: true, name: true, username: true } } } }) }

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(req); if (!user) return jsonError("Unauthorized", 401)
    const comment = await getComment((await params).id); if (!comment) return jsonError("Comentario no existe", 404)
    if (comment.userId !== user.id) return jsonError("No autorizado", 403)
    const parsed = updateCommentSchema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return jsonError("Datos inválidos", 400)
    const updated = await prisma.comment.update({ where: { id: comment.id }, data: { content: parsed.data.content }, include: { user: { select: { id: true, name: true, username: true } } } })
    return jsonOk({ comment: updated })
  } catch (err) { return jsonException(err, { route: "PATCH /api/comments/:id" }) }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(req); if (!user) return jsonError("Unauthorized", 401)
    const comment = await getComment((await params).id); if (!comment) return jsonError("Comentario no existe", 404)
    if (comment.userId !== user.id && user.role !== "ADMIN") return jsonError("No autorizado", 403)
    await prisma.comment.delete({ where: { id: comment.id } }); return jsonOk({ ok: true })
  } catch (err) { return jsonException(err, { route: "DELETE /api/comments/:id" }) }
}
