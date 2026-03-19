import { cookies } from "next/headers"
import { AUTH_COOKIE_NAME } from "@/lib/auth"
import { jsonOk } from "@/lib/http"

export const runtime = "nodejs"

export async function POST() {
  ;(await cookies()).set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  })
  return jsonOk({ ok: true })
}

