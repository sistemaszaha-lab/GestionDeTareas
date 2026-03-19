import type { NextAuthOptions } from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ user }) {
      return Boolean(user.email)
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        ;(token as unknown as { role?: unknown }).role = (user as unknown as { role?: unknown }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as unknown as { id?: unknown }).id = token.sub
        ;(session.user as unknown as { role?: unknown }).role = (token as unknown as { role?: unknown }).role
      }
      return session
    }
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        const email = profile.email ?? ""
        const name = profile.name ?? email.split("@")[0] ?? "Usuario"
        return {
          id: profile.sub,
          email,
          name,
          image: profile.picture
        }
      }
    })
  ]
}
