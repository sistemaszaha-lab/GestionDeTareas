import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth"

const PUBLIC_PATHS = ["/login"]
const PUBLIC_API_PREFIXES = ["/api/auth"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (isPublicPath || isPublicApi) return NextResponse.next()

  const needsAuth = pathname.startsWith("/dashboard") || pathname.startsWith("/api")
  if (!needsAuth) return NextResponse.next()

  const nextAuthToken = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  }).catch(() => null)
  if (nextAuthToken) return NextResponse.next()

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value
  if (!token) return deny(req)

  try {
    await verifyAuthToken(token)
    return NextResponse.next()
  } catch {
    return deny(req)
  }
}

function deny(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const url = req.nextUrl.clone()
  url.pathname = "/login"
  url.searchParams.set("next", req.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
}
