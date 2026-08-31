import { prisma } from "@/lib/prisma"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { createNoteSchema } from "@/lib/validators"
import { Prisma } from "@prisma/client"

export const runtime = "nodejs"

function prismaErrorResponse(err: unknown) {
  if (err instanceof Prisma.PrismaClientValidationError) {
    return jsonError("Datos inválidos", 400)
  }
  return null
}

export async function GET(req: Request) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const notes = await prisma.note.findMany({
      where: {
        userId: user.id,
        deletedAt: null
      },
      orderBy: [
        { isPinned: "desc" },
        { order: "desc" },
        { createdAt: "desc" }
      ]
    })

    return jsonOk({ notes })
  } catch (err) {
    return prismaErrorResponse(err) ?? jsonException(err, { route: "GET /api/notes" })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const body = await req.json().catch(() => null)
    if (!body) return jsonError("Body requerido", 400)

    const parsed = createNoteSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError("Datos inválidos", 400)
    }

    const note = await prisma.note.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        color: parsed.data.color ?? null,
        isPinned: parsed.data.isPinned ?? false,
        order: parsed.data.order ?? 0,
        userId: user.id
      }
    })

    return jsonOk({ note }, { status: 201 })
  } catch (err) {
    return prismaErrorResponse(err) ?? jsonException(err, { route: "POST /api/notes" })
  }
}
