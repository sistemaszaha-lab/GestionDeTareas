import { prisma } from "@/lib/prisma"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { updateUserSchema } from "@/lib/validators"
import { hashPassword } from "@/lib/password"
import { Prisma, UserRole } from "@prisma/client"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"

function prismaErrorResponse(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return jsonError("Email o username ya existe", 409)
    if (err.code === "P2025") return jsonError("Usuario no encontrado", 404)
    if (err.code === "P2003") return jsonError("No se puede eliminar: el usuario tiene registros relacionados.", 409)
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

async function ensureNotLastAdmin(targetUserId: string, nextRole?: UserRole, deleting = false) {
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, role: true } })
  if (!target) return { ok: false as const, error: jsonError("Usuario no encontrado", 404) }

  const willBeAdmin = deleting ? false : (nextRole ?? target.role) === "ADMIN"
  const isCurrentlyAdmin = target.role === "ADMIN"

  if (!isCurrentlyAdmin) return { ok: true as const, target }

  if (deleting || !willBeAdmin) {
    const admins = await prisma.user.count({ where: { role: "ADMIN", NOT: { id: targetUserId } } })
    if (admins === 0) {
      return { ok: false as const, error: jsonError("No se puede dejar el sistema sin administradores.", 400) }
    }
  }

  return { ok: true as const, target }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireSession(req)
    if (!currentUser) return jsonError("Unauthorized", 401)
    if (currentUser.role !== "ADMIN") return jsonError("Forbidden", 403)

    const { id: rawId } = await Promise.resolve(ctx.params)
    const id = rawId?.trim()
    if (!id) return jsonError("ID inválido", 400)

    const body = await req.json().catch(() => null)
    if (!body) return jsonError("Body requerido", 400)

    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      console.warn("PATCH /api/users/:id validation", {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
      })
      return jsonError("Datos inválidos", 400)
    }

    const roleRaw = parsed.data.role
    const nextRole: UserRole | undefined = roleRaw ? (roleRaw.toUpperCase() === "ADMIN" ? "ADMIN" : "USER") : undefined

    const adminGuard = await ensureNotLastAdmin(id, nextRole, false)
    if (!adminGuard.ok) return adminGuard.error

    const current = await prisma.user.findUnique({
      where: { id },
      select: { id: true, firstName: true, middleName: true, lastName: true }
    })
    if (!current) return jsonError("Usuario no encontrado", 404)

    const email = parsed.data.email?.trim().toLowerCase()
    const username = parsed.data.username?.trim().toLowerCase()

    if (email || username) {
      const existing = await prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
            ...(username ? [{ username: { equals: username, mode: "insensitive" as const } }] : [])
          ]
        },
        select: { email: true, username: true }
      })

      if (existing) {
        if (email && existing.email?.toLowerCase() === email) return jsonError("Email ya existe", 409)
        if (username && existing.username?.toLowerCase() === username) return jsonError("Username ya existe", 409)
        return jsonError("Email o username ya existe", 409)
      }
    }

    const firstName = parsed.data.firstName?.trim() ?? current.firstName
    const middleName = parsed.data.middleName !== undefined ? parsed.data.middleName?.trim() || null : current.middleName
    const lastName = parsed.data.lastName?.trim() ?? current.lastName

    const name =
      parsed.data.firstName !== undefined || parsed.data.middleName !== undefined || parsed.data.lastName !== undefined
        ? buildDisplayName({ firstName, middleName, lastName })
        : undefined

    const passwordHash = parsed.data.password ? await hashPassword(parsed.data.password) : undefined

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(parsed.data.firstName !== undefined ? { firstName } : {}),
        ...(parsed.data.middleName !== undefined ? { middleName } : {}),
        ...(parsed.data.lastName !== undefined ? { lastName } : {}),
        ...(email ? { email } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone.trim() } : {}),
        ...(username ? { username } : {}),
        ...(nextRole ? { role: nextRole } : {}),
        ...(passwordHash ? { password: passwordHash } : {})
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

    return jsonOk({ user })
  } catch (err) {
    return prismaErrorResponse(err) ?? jsonException(err, { route: "PATCH /api/users/:id" })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireSession(req)
    if (!currentUser) return jsonError("Unauthorized", 401)
    if (currentUser.role !== "ADMIN") return jsonError("Forbidden", 403)

    const { id: rawId } = await Promise.resolve(ctx.params)
    const id = rawId?.trim()
    if (!id) return jsonError("ID inválido", 400)

    const adminGuard = await ensureNotLastAdmin(id, undefined, true)
    if (!adminGuard.ok) return adminGuard.error

    await prisma.user.delete({ where: { id } })
    return jsonOk({ ok: true })
  } catch (err) {
    return prismaErrorResponse(err) ?? jsonException(err, { route: "DELETE /api/users/:id" })
  }
}