import type { DefaultSession, DefaultUser } from "next-auth"
import type { JWT as DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      isNewUser?: boolean
    }
  }

  interface User extends DefaultUser {
    isNewUser?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    isNewUser?: boolean
  }
}

