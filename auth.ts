import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
const debugEnabled = process.env.NEXTAUTH_DEBUG === "true"

if (process.env.NODE_ENV === "production") {
  if (!process.env.DATABASE_URL) console.warn("[auth] Missing DATABASE_URL (required)")
  if (!authSecret) console.warn("[auth] Missing AUTH_SECRET/NEXTAUTH_SECRET (required)")
  if (!process.env.NEXTAUTH_URL) console.warn("[auth] Missing NEXTAUTH_URL (required for stable cookies/redirects in production)")
}

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  useSecureCookies: process.env.NODE_ENV === "production",
  debug: debugEnabled,
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
      if (debugEnabled) console.log("[next-auth][debug]", code, metadata)
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
        ;(token as unknown as { email?: unknown }).email = (user as any).email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.sub
        ;(session.user as any).role = (token as any).role
        ;(session.user as any).username = (token as any).username
        ;(session.user as any).email = (token as any).email
      }
      return session
    }
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Email o username", type: "text" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        try {
          const identifierRaw = (credentials as any)?.email ?? credentials?.username
          const identifier = typeof identifierRaw === "string" ? identifierRaw.trim().toLowerCase() : ""
          const password = typeof credentials?.password === "string" ? credentials.password : ""

          if (debugEnabled) {
            console.log("[auth] authorize", {
              hasIdentifier: Boolean(identifier),
              hasPassword: Boolean(password),
              hasDatabaseUrl: Boolean(process.env.DATABASE_URL)
            })
          }

          if (!identifier || !password) return null

          // Si llega un email, intentamos mapearlo a username tomando la parte antes del '@'.
          const usernameCandidate = identifier.includes("@") ? identifier.split("@")[0] : identifier

          const user = await prisma.user.findFirst({
            where: {
              username: { equals: usernameCandidate, mode: "insensitive" }
            }
          })

          if (!user) {
            if (debugEnabled) console.log("[auth] authorize: user not found", { usernameCandidate })
            return null
          }

          if (!user.passwordHash) {
            console.warn("[auth] authorize: user has no passwordHash", { userId: user.id })
            return null
          }

          const ok = await bcrypt.compare(password, user.passwordHash)
          if (!ok) {
            if (debugEnabled) console.log("[auth] authorize: invalid password", { userId: user.id })
            return null
          }

          return {
            id: user.id,
            name: user.name,
            email: identifier.includes("@") ? identifier : `${user.username}@local`,
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