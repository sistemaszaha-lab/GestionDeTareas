import { cookies } from "next/headers"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth"

export type AuthUser = {
  id: string
  email: string
  name: string
  role: "ADMIN" | "EMPLOYEE"
}

export async function requireSession(_req: Request): Promise<AuthUser | null> {
  const nextAuthSession = await getServerSession(authOptions).catch(() => null)
  const nextAuthUser = nextAuthSession?.user

  if (nextAuthUser?.email) {
    const sessionUser = nextAuthUser as unknown as { id?: string; role?: AuthUser["role"] }
    if (sessionUser.id && sessionUser.role && nextAuthUser.name) {
      return {
        id: sessionUser.id,
        email: nextAuthUser.email,
        name: nextAuthUser.name,
        role: sessionUser.role
      }
    }

    const user = await prisma.user.findUnique({ where: { email: nextAuthUser.email } })
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  }

  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value
  if (!token) return null
  try {
    const payload = await verifyAuthToken(token)
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role
    }
  } catch {
    return null
  }
}
