import { prisma } from "@/lib/prisma"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { noteTrashBulkSchema } from "@/lib/validators"
import { Prisma } from "@prisma/client"

export const runtime = "nodejs"

function prismaErrorResponse(err: unknown) {
  if (err instanceof Prisma.PrismaClientValidationError) {
    return jsonError("Datos inválidos", 400)
  }
  return null
}

export async function POST(req: Request) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const body = await req.json().catch(() => null)
    if (!body) return jsonError("Body requerido", 400)

    const parsed = noteTrashBulkSchema.safeParse(body)
    if (!parsed.success) return jsonError("Datos inválidos", 400)

    const noteIds = parsed.data.noteIds

    // Validate that notes belong to user
    const notes = await prisma.note.findMany({
      where: { id: { in: noteIds }, userId: user.id }
    })

    if (notes.length !== noteIds.length) {
      return jsonError("Una o más notas no encontradas o sin permisos", 403)
    }

    await prisma.note.updateMany({
      where: { id: { in: noteIds } },
      data: {
        deletedAt: new Date(),
        deletedById: user.id
      }
    })

    return jsonOk({ ok: true })
  } catch (err) {
    return prismaErrorResponse(err) ?? jsonException(err, { route: "POST /api/notes/trash" })
  }
}
