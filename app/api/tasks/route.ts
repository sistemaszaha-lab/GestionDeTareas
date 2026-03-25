import { prisma } from "@/lib/prisma"
import { jsonError, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { createTaskSchema } from "@/lib/validators"

export const runtime = "nodejs"

export async function GET(req: Request) {
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
}

export async function POST(req: Request) {
  const user = await requireSession(req)
  if (!user) return jsonError("Unauthorized", 401)
  if (user.role !== "ADMIN") return jsonError("Forbidden", 403)

  const body = await req.json().catch(() => null)
  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) return jsonError("Datos inválidos", 400)

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      assignedToId: parsed.data.assignedToId,
      ...(parsed.data.priority ? { priority: parsed.data.priority as any } : {})
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
}

