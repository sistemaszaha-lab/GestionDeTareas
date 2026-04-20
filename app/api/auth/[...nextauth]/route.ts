import NextAuth, { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { authOptions as baseAuthOptions } from "@/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED_GOOGLE_DOMAIN = "tuempresa.com"

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

if (process.env.NODE_ENV !== "production") {
  if (!process.env.NEXTAUTH_URL) console.warn("[nextauth] Missing NEXTAUTH_URL (expected http://localhost:3000 for local)")
  if (!process.env.NEXTAUTH_SECRET) console.warn("[nextauth] Missing NEXTAUTH_SECRET")
  if (!process.env.GOOGLE_CLIENT_ID) console.warn("[nextauth] Missing GOOGLE_CLIENT_ID (Google sign-in will be hidden)")
  if (!process.env.GOOGLE_CLIENT_SECRET) console.warn("[nextauth] Missing GOOGLE_CLIENT_SECRET (Google sign-in will be hidden)")
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

const authOptions: NextAuthOptions = {
  ...baseAuthOptions,
  secret: process.env.NEXTAUTH_SECRET ?? (baseAuthOptions.secret as any),
  providers: [
    ...((baseAuthOptions.providers ?? []) as any[]).filter((p) => (p as any)?.id !== "google"),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: { params: { hd: ALLOWED_GOOGLE_DOMAIN } }
          })
        ]
      : [])
  ],
  callbacks: {
    ...baseAuthOptions.callbacks,
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === "google") {
          const emailRaw = (profile as any)?.email ?? (user as any)?.email
          const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : ""

          if (!email) {
            console.warn("[nextauth] Google sign-in rejected: missing email")
            return false
          }

          if (!email.endsWith(`@${ALLOWED_GOOGLE_DOMAIN}`)) {
            console.warn("[nextauth] Google sign-in rejected: invalid domain", {
              email,
              allowed: `@${ALLOWED_GOOGLE_DOMAIN}`
            })
            return false
          }
        }

        return true
      } catch (err) {
        console.error("[nextauth] signIn callback failed", err)
        return false
      }
    }
  }
}

authOptions.callbacks = {
  ...authOptions.callbacks,
  async jwt({ token, user, account, profile }) {
    try {
      if (account?.provider === "google") {
        const emailRaw = (profile as any)?.email ?? (user as any)?.email
        const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : ""

        if (!email) {
          console.warn("[nextauth] jwt: missing email from Google")
          return token
        }

        if (!email.endsWith(`@${ALLOWED_GOOGLE_DOMAIN}`)) {
          console.warn("[nextauth] jwt: invalid domain", { email, allowed: `@${ALLOWED_GOOGLE_DOMAIN}` })
          return token
        }

        const nameFromProfile =
          typeof (profile as any)?.name === "string" ? (profile as any).name : typeof (user as any)?.name === "string" ? (user as any).name : ""
        const { firstName, middleName, lastName } = splitName(nameFromProfile)
        const usernameBase = email.includes("@") ? email.split("@")[0] : email
        const existing = await prisma.user.findUnique({
          where: { email },
          select: { id: true, username: true, role: true, email: true }
        })
        const username = existing?.username ?? (await ensureUniqueUsername(usernameBase))

        const dbUser = await prisma.user.upsert({
          where: { email },
          update: {
            name: `${firstName}${middleName ? ` ${middleName}` : ""} ${lastName}`.trim(),
            firstName,
            middleName,
            lastName,
            username,
            image: typeof (profile as any)?.picture === "string" ? (profile as any).picture : (user as any)?.image ?? null
          },
          create: {
            name: `${firstName}${middleName ? ` ${middleName}` : ""} ${lastName}`.trim(),
            firstName,
            middleName,
            lastName,
            email,
            phone: "",
            username,
            password: null,
            role: "USER"
          },
          select: { id: true, email: true, username: true, role: true }
        })

        token.sub = dbUser.id
        ;(token as any).email = dbUser.email
        ;(token as any).username = dbUser.username
        ;(token as any).role = dbUser.role
      }

      const baseJwt = baseAuthOptions.callbacks?.jwt
      if (typeof baseJwt === "function") return await (baseJwt as any)({ token, user, account, profile })
      return token
    } catch (err) {
      console.error("[nextauth] jwt callback failed", err)
      return token
    }
  },
  async session({ session, token }) {
    try {
      if (session.user) {
        ;(session.user as any).id = token.sub
        if ((token as any).role) (session.user as any).role = (token as any).role
        if ((token as any).username) (session.user as any).username = (token as any).username
        if ((token as any).email) (session.user as any).email = (token as any).email
      }

      const baseSession = baseAuthOptions.callbacks?.session
      if (typeof baseSession === "function") return await (baseSession as any)({ session, token })
      return session
    } catch (err) {
      console.error("[nextauth] session callback failed", err)
      return session
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
