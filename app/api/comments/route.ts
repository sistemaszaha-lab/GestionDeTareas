import { prisma } from "@/lib/prisma"
import { jsonError, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { createCommentSchema } from "@/lib/validators"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const user = await requireSession(req)
  if (!user) return jsonError("Unauthorized", 401)

  const body = await req.json().catch(() => null)
  const parsed = createCommentSchema.safeParse(body)
  if (!parsed.success) return jsonError("Datos inválidos", 400)

  const task = await prisma.task.findUnique({ where: { id: parsed.data.taskId } })
  if (!task) return jsonError("Tarea no existe", 404)

  const comment = await prisma.comment.create({
    data: { taskId: parsed.data.taskId, userId: user.id, content: parsed.data.content },
    include: { user: { select: { id: true, name: true, email: true } } }
  })

  return jsonOk({ comment }, { status: 201 })
}

