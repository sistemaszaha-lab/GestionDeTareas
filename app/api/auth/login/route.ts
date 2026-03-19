import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/password"
import { AUTH_COOKIE_NAME, signAuthToken } from "@/lib/auth"
import { jsonError, jsonOk } from "@/lib/http"
import { loginSchema } from "@/lib/validators"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) return jsonError("Datos inválidos", 400)

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user?.passwordHash) return jsonError("Credenciales inválidas", 401)

  const ok = await verifyPassword(parsed.data.password, user.passwordHash)
  if (!ok) return jsonError("Credenciales inválidas", 401)

  const token = await signAuthToken({
    sub: user.id,
    email: user.email,
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
}
