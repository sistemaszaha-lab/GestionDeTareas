import NextAuth, { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { authOptions as baseAuthOptions } from "@/auth"

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

const authOptions: NextAuthOptions = {
  ...baseAuthOptions,
  secret: process.env.NEXTAUTH_SECRET ?? (baseAuthOptions.secret as any),
  providers: [
    ...((baseAuthOptions.providers ?? []) as any[]).filter((p) => (p as any)?.id !== "google"),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            authorization: { params: { hd: ALLOWED_GOOGLE_DOMAIN } }
          })
        ]
      : [])
  ],
  callbacks: {
    ...baseAuthOptions.callbacks,
    async signIn(params) {
      try {
        if (params.account?.provider === "google") {
          const emailRaw = (params.profile as any)?.email ?? (params.user as any)?.email
          const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : ""

          if (!email) {
            console.warn("[nextauth] Google sign-in rejected: missing email")
            return "/login?error=google_no_email"
          }

          if (!email.endsWith(`@${ALLOWED_GOOGLE_DOMAIN}`)) {
            console.warn("[nextauth] Google sign-in rejected: invalid domain", { email, allowed: ALLOWED_GOOGLE_DOMAIN })
            return "/login?error=invalid_domain"
          }
        }

        const baseSignIn = baseAuthOptions.callbacks?.signIn
        if (typeof baseSignIn === "function") return await (baseSignIn as any)(params)
        return true
      } catch (err) {
        console.error("[nextauth] signIn callback failed", err)
        return "/login?error=AccessDenied"
      }
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
