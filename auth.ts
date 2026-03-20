import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/password"

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

if (process.env.NODE_ENV === "production") {
  if (!process.env.DATABASE_URL) console.warn("[auth] Missing DATABASE_URL (required)")
  if (!authSecret) console.warn("[auth] Missing AUTH_SECRET/NEXTAUTH_SECRET (required)")
  if (!process.env.NEXTAUTH_URL) console.warn("[auth] Missing NEXTAUTH_URL (required for stable cookies/redirects in production)")
}

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  useSecureCookies: process.env.NODE_ENV === "production",
  debug: process.env.NEXTAUTH_DEBUG === "true",
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  logger: {
    error(code, metadata) {
      console.error("[next-auth][error]", code, metadata)
    },
    warn(code) {
      console.warn("[next-auth][warn]", code)
    },
    debug(code, metadata) {
      if (process.env.NEXTAUTH_DEBUG === "true") console.log("[next-auth][debug]", code, metadata)
    }
  },
  callbacks: {
    async signIn({ user }) {
      return Boolean((user as any)?.id)
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as any).id
        ;(token as unknown as { role?: unknown }).role = (user as any).role
        ;(token as unknown as { username?: unknown }).username = (user as any).username
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.sub
        ;(session.user as any).role = (token as any).role
        ;(session.user as any).username = (token as any).username
      }
      return session
    }
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        try {
          const username = credentials?.username?.trim().toLowerCase()
          const password = credentials?.password ?? ""

          if (!username || !password) return null

          const user = await prisma.user.findUnique({ where: { username } })
          if (!user?.passwordHash) return null

          const ok = await verifyPassword(password, user.passwordHash)
          if (!ok) return null

          return {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role
          } as any
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const name = err instanceof Error ? err.name : "Unknown"
          console.error("[auth] Credentials authorize failed", {
            name,
            message,
            hasDatabaseUrl: Boolean(process.env.DATABASE_URL)
          })
          return null
        }
      }
    })
  ]
}