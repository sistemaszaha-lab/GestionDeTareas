import { prisma } from "@/lib/prisma"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { notePermanentDeleteSchema } from "@/lib/validators"
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

    const parsed = notePermanentDeleteSchema.safeParse(body)
    if (!parsed.success) return jsonError("Datos inválidos", 400)

    const noteIds = parsed.data.noteIds

    const notes = await prisma.note.findMany({
      where: { id: { in: noteIds }, userId: user.id }
    })

    if (notes.length !== noteIds.length) {
      return jsonError("Una o más notas no encontradas o sin permisos", 403)
    }

    await prisma.note.deleteMany({
      where: { id: { in: noteIds } }
    })

    return jsonOk({ ok: true, deletedCount: noteIds.length })
  } catch (err) {
    return prismaErrorResponse(err) ?? jsonException(err, { route: "POST /api/notes/trash/permanent" })
  }
}
