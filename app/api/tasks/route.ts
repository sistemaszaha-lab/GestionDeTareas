import { prisma } from "@/lib/prisma"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { createTaskSchema } from "@/lib/validators"
import { Prisma } from "@prisma/client"

export const runtime = "nodejs"

function parseDueDate(input: string | null | undefined): Date | null {
  if (!input) return null
  // Treat as end-of-day UTC for a predictable "due date" semantics.
  const d = new Date(`${input}T23:59:59.999Z`)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function prismaErrorResponse(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2003") return jsonError("El usuario asignado no existe.", 400)
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return jsonError("Datos inválidos", 400)
  }

  return null
}

export async function GET(req: Request) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const url = new URL(req.url)
    const assignedToId = url.searchParams.get("assignedToId") ?? undefined
    const status = url.searchParams.get("status") ?? undefined
    const priority = url.searchParams.get("priority") ?? undefined

    const tasks = await prisma.task.findMany({
      where: {
        ...(assignedToId ? { assignedToId } : {}),
        ...(status ? { status: status as any } : {}),
        ...(priority ? { priority: priority as any } : {})
      },
      include: {
        assignedTo: { select: { id: true, name: true, username: true, role: true } },
        comments: {
          include: { user: { select: { id: true, name: true, username: true } } },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return jsonOk({ tasks })
  } catch (err) {
    return prismaErrorResponse(err) ?? jsonException(err, { route: "GET /api/tasks" })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)
    if (user.role !== "ADMIN") return jsonError("Forbidden", 403)

    const body = await req.json().catch(() => null)
    if (!body) return jsonError("Body requerido", 400)

    const parsed = createTaskSchema.safeParse(body)
    if (!parsed.success) {
      console.warn("POST /api/tasks validation", {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
      })
      return jsonError("Datos inválidos", 400)
    }

    const assignedUser = await prisma.user.findUnique({
      where: { id: parsed.data.assignedToId },
      select: { id: true }
    })
    if (!assignedUser) return jsonError("El usuario asignado no existe.", 400)

    const dueDate = parseDueDate(parsed.data.dueDate ?? null)

    const task = await prisma.task.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        assignedToId: parsed.data.assignedToId,
        ...(parsed.data.priority ? { priority: parsed.data.priority as any } : {}),
        ...(parsed.data.dueDate !== undefined ? { dueDate } : {})
      },
      include: {
        assignedTo: { select: { id: true, name: true, username: true, role: true } },
        comments: {
          include: { user: { select: { id: true, name: true, username: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    })

    return jsonOk({ task }, { status: 201 })
  } catch (err) {
    return prismaErrorResponse(err) ?? jsonException(err, { route: "POST /api/tasks" })
  }
}
