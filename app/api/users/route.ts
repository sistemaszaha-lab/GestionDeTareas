import { prisma } from "@/lib/prisma"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { createUserSchema } from "@/lib/validators"
import { hashPassword } from "@/lib/password"
import { Prisma, UserRole } from "@prisma/client"

export const runtime = "nodejs"

function prismaErrorResponse(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return jsonError("Email o username ya existe", 409)
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return jsonError("Datos inválidos", 400)
  }

  return null
}

function buildDisplayName(input: { firstName: string; middleName?: string | null; lastName: string }) {
  const mid = input.middleName?.trim()
  return [input.firstName.trim(), mid ? mid : null, input.lastName.trim()].filter(Boolean).join(" ")
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireSession(req)
    if (!currentUser) return jsonError("Unauthorized", 401)
    if (currentUser.role !== "ADMIN") return jsonError("Forbidden", 403)

    const body = await req.json().catch(() => null)
    if (!body) return jsonError("Body requerido", 400)

    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      console.warn("POST /api/users validation", {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
      })
      return jsonError("Datos inválidos", 400)
    }

    const email = parsed.data.email.trim().toLowerCase()
    const username = parsed.data.username.trim().toLowerCase()
    const roleRaw = parsed.data.role ?? "user"
    const role: UserRole = roleRaw.toUpperCase() === "ADMIN" ? "ADMIN" : "USER"

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { username: { equals: username, mode: "insensitive" } }
        ]
      },
      select: { email: true, username: true }
    })

    if (existing) {
      if (existing.email?.toLowerCase() === email) return jsonError("Email ya existe", 409)
      if (existing.username?.toLowerCase() === username) return jsonError("Username ya existe", 409)
      return jsonError("Email o username ya existe", 409)
    }

    const passwordHash = await hashPassword(parsed.data.password)

    const name = buildDisplayName({
      firstName: parsed.data.firstName,
      middleName: parsed.data.middleName,
      lastName: parsed.data.lastName
    })

    const user = await prisma.user.create({
      data: {
        name,
        firstName: parsed.data.firstName.trim(),
        middleName: parsed.data.middleName?.trim() || null,
        lastName: parsed.data.lastName.trim(),
        email,
        phone: parsed.data.phone.trim(),
        username,
        password: passwordHash,
        role
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        username: true,
        role: true,
        createdAt: true
      }
    })

    return jsonOk({ user }, { status: 201 })
  } catch (err) {
    return prismaErrorResponse(err) ?? jsonException(err, { route: "POST /api/users" })
  }
}

