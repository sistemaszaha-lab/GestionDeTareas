import { prisma } from "@/lib/prisma"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { updateNoteSchema } from "@/lib/validators"
import { Prisma } from "@prisma/client"

export const runtime = "nodejs"

function prismaErrorResponse(err: unknown) {
  if (err instanceof Prisma.PrismaClientValidationError) {
    return jsonError("Datos inválidos", 400)
  }
  return null
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const params = await props.params
    const noteId = params.id

    const existingNote = await prisma.note.findUnique({
      where: { id: noteId, userId: user.id }
    })

    if (!existingNote) {
      return jsonError("Nota no encontrada", 404)
    }

    const body = await req.json().catch(() => null)
    if (!body) return jsonError("Body requerido", 400)

    const parsed = updateNoteSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError("Datos inválidos", 400)
    }

    console.log("PATCH /api/notes/:id - updating note with:", parsed.data);

    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
        ...(parsed.data.isPinned !== undefined ? { isPinned: parsed.data.isPinned } : {}),
        ...(parsed.data.order !== undefined ? { order: parsed.data.order } : {})
      }
    })

    return jsonOk({ note: updatedNote })
  } catch (err) {
    return prismaErrorResponse(err) ?? jsonException(err, { route: "PATCH /api/notes/:id" })
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const params = await props.params
    const noteId = params.id

    const existingNote = await prisma.note.findUnique({
      where: { id: noteId, userId: user.id }
    })

    if (!existingNote) {
      return jsonError("Nota no encontrada", 404)
    }

    await prisma.note.delete({
      where: { id: noteId }
    })

    return jsonOk({ ok: true })
  } catch (err) {
    return prismaErrorResponse(err) ?? jsonException(err, { route: "DELETE /api/notes/:id" })
  }
}
