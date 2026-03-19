import { SignJWT, jwtVerify } from "jose"
import type { UserRole } from "@prisma/client"

export const AUTH_COOKIE_NAME = "auth_token"

type AuthTokenPayload = {
  sub: string
  email: string
  name: string
  role: UserRole
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("Missing JWT_SECRET env var")
  return new TextEncoder().encode(secret)
}

export async function signAuthToken(payload: AuthTokenPayload) {
  const secret = getJwtSecret()
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)
}

export async function verifyAuthToken(token: string) {
  const secret = getJwtSecret()
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] })
  return payload as unknown as AuthTokenPayload & { exp: number; iat: number }
}

