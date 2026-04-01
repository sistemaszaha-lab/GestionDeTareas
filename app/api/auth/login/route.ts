import { cookies } from "next/headers"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/password"
import { AUTH_COOKIE_NAME, signAuthToken } from "@/lib/auth"
import { jsonError, jsonOk } from "@/lib/http"
import { loginSchema } from "@/lib/validators"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const contentLength = req.headers.get("content-length")
    if (contentLength === "0") return jsonError("Body requerido", 400)

    const raw = await req.text().catch(() => "")
    if (!raw.trim()) return jsonError("Body requerido", 400)

    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return jsonError("JSON inválido", 400)
    }

    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return jsonError("Datos inválidos", 400)
    const identifier = parsed.data.username.trim().toLowerCase()

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: identifier, mode: "insensitive" } },
          { email: { equals: identifier, mode: "insensitive" } }
        ]
      }
    })
    if (!user?.password) return jsonError("Credenciales inválidas", 401)

    const ok = await verifyPassword(parsed.data.password, user.password)
    if (!ok) return jsonError("Credenciales inválidas", 401)

    const token = await signAuthToken({
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    })

    const isProd = process.env.NODE_ENV === "production"
    ;(await cookies()).set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    })

    return jsonOk({ ok: true })
  } catch (err) {
    const errorId = randomUUID()
    const message = err instanceof Error ? err.message : String(err)
    const name = err instanceof Error ? err.name : "Unknown"

    console.error("/api/auth/login error", {
      errorId,
      name,
      message,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasJwtSecret: Boolean(process.env.JWT_SECRET)
    })

    if (message.includes("Missing JWT_SECRET")) {
      return jsonError("Configuración inválida del servidor (JWT_SECRET faltante)", 500)
    }

    return jsonError(`Error interno (ref: ${errorId})`, 500)
  }
}