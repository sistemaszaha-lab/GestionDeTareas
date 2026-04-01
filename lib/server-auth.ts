import { cookies } from "next/headers"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth"

export type AuthUser = {
  id: string
  username: string
  name: string
  role: "ADMIN" | "USER"
}

export async function requireSession(_req: Request): Promise<AuthUser | null> {
  const nextAuthSession = await getServerSession(authOptions).catch(() => null)
  const nextAuthUser = nextAuthSession?.user as any

  if (nextAuthUser?.id) {
    if (nextAuthUser.username && nextAuthUser.role && nextAuthUser.name) {
      return {
        id: nextAuthUser.id,
        username: nextAuthUser.username,
        name: nextAuthUser.name,
        role: nextAuthUser.role
      }
    }

    const user = await prisma.user.findUnique({ where: { id: nextAuthUser.id } })
    if (!user) return null
    return {
      id: user.id,
      username: user.username,
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
      username: payload.username,
      name: payload.name,
      role: payload.role
    }
  } catch {
    return null
  }
}