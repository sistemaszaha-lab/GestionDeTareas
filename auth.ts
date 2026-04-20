import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
const debugEnabled = process.env.NEXTAUTH_DEBUG === "true"
const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
const allowedGoogleDomain = "comerciointeligentebc.com"
const allowedGoogleEmailDomain = "@comerciointeligentebc.com"

function isAllowedCompanyEmail(email: string) {
  const e = email.trim().toLowerCase()
  return e.endsWith(`@${allowedGoogleDomain}`)
}

function sanitizeUsernameBase(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 64)
}

async function ensureUniqueUsername(baseInput: string) {
  const base = sanitizeUsernameBase(baseInput) || `user-${Math.random().toString(16).slice(2, 8)}`
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`
    const exists = await prisma.user.findFirst({
      where: { username: { equals: candidate, mode: "insensitive" } },
      select: { id: true }
    })
    if (!exists) return candidate
  }
  return `${base}-${Date.now().toString(16)}`.slice(0, 64)
}

function splitName(full: string | null | undefined) {
  const raw = (full ?? "").trim().replace(/\s+/g, " ")
  if (!raw) return { firstName: "Usuario", middleName: null as string | null, lastName: "Google" }
  const parts = raw.split(" ").filter(Boolean)
  const firstName = parts[0] ?? "Usuario"
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "Google"
  const middle = parts.length > 2 ? parts.slice(1, -1).join(" ") : ""
  return { firstName, middleName: middle ? middle : null, lastName }
}

if (process.env.NODE_ENV === "production") {
  if (!process.env.DATABASE_URL) console.warn("[auth] Missing DATABASE_URL (required)")
  if (!authSecret) console.warn("[auth] Missing AUTH_SECRET/NEXTAUTH_SECRET (required)")
  if (!process.env.NEXTAUTH_URL) console.warn("[auth] Missing NEXTAUTH_URL (required for stable cookies/redirects in production)")
  if (!process.env.GOOGLE_CLIENT_ID) console.warn("[auth] Missing GOOGLE_CLIENT_ID (required for Google login)")
  if (!process.env.GOOGLE_CLIENT_SECRET) console.warn("[auth] Missing GOOGLE_CLIENT_SECRET (required for Google login)")
}

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  useSecureCookies: process.env.NODE_ENV === "production",
  debug: debugEnabled,
  pages: {
    signIn: "/login",
    error: "/login"
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
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const rawEmail = (user as any)?.email ?? (profile as any)?.email
        const email = typeof rawEmail === "string" ? rawEmail.toLowerCase().trim() : ""
        console.log("[auth] Google email recibido:", email || null)

        if (!email || !email.endsWith(allowedGoogleEmailDomain)) {
          console.log("Acceso denegado:", email || null)
          return "/login?error=unauthorized"
        }

        const emailVerified = (profile as any)?.email_verified
        if (emailVerified === false) return "/login?error=google_unverified"

        const existing = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, username: true, role: true }
        })

        if (!existing) {
          // Usuario nuevo (Google): establecer flag para redirección en frontend
          ;(user as any).isNewUser = true
          return true
        }

        ;(user as any).id = existing.id
        ;(user as any).email = existing.email
        ;(user as any).name = existing.name
        ;(user as any).username = existing.username
        ;(user as any).role = existing.role

        ;(user as any).isNewUser = false
        return true
      }

      return Boolean((user as any)?.id)
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.sub = (user as any).id
        ;(token as unknown as { role?: unknown }).role = (user as any).role
        ;(token as unknown as { username?: unknown }).username = (user as any).username
        ;(token as unknown as { email?: unknown }).email = (user as any).email
        ;(token as any).isNewUser = Boolean((user as any).isNewUser)
      }

      // Ensure tokens created by OAuth have our DB user id/role/username.
      if (account?.provider === "google") {
        const rawEmail = (profile as any)?.email ?? (user as any)?.email ?? (token as any)?.email
        const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : ""
        ;(token as any).email = email || undefined
        ;(token as any).name =
          typeof (profile as any)?.name === "string" ? (profile as any).name : typeof (user as any)?.name === "string" ? (user as any).name : (token as any).name

        const dbUser = email
          ? await prisma.user.findUnique({
              where: { email },
              select: { id: true, email: true, username: true, role: true }
            })
          : null

        if (dbUser) {
          token.sub = dbUser.id
          ;(token as any).email = dbUser.email
          ;(token as any).username = dbUser.username
          ;(token as any).role = dbUser.role
          ;(token as any).isNewUser = false
        } else {
          ;(token as any).isNewUser = true
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) {
          ;(session.user as any).id = token.sub
        }
        ;(session.user as any).role = (token as any).role
        ;(session.user as any).username = (token as any).username
        ;(session.user as any).email = (token as any).email
        ;(session as any).isNewUser = Boolean((token as any).isNewUser)
        ;(session.user as any).isNewUser = Boolean((token as any).isNewUser)
      }
      return session
    }
  },
  providers: [
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            // UX hint for Google; domain is still validated in `callbacks.signIn`.
            authorization: { params: { hd: allowedGoogleDomain } }
          })
        ]
      : []),
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

          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { username: { equals: identifier, mode: "insensitive" } },
                { email: { equals: identifier, mode: "insensitive" } }
              ]
            }
          })

          if (!user) {
            if (debugEnabled) console.log("[auth] authorize: user not found", { identifier })
            return null
          }

          if (!user.password) {
            console.warn("[auth] authorize: user has no password", { userId: user.id })
            return null
          }

          const ok = await bcrypt.compare(password, user.password)
          if (!ok) {
            if (debugEnabled) console.log("[auth] authorize: invalid password", { userId: user.id })
            return null
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email ?? (identifier.includes("@") ? identifier : `${user.username}@local`),
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
