import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")

  return NextResponse.json({
    hasSecret: !!process.env.N8N_API_SECRET,
    authHeaderReceived: !!authHeader,
    authHeaderPreview: authHeader?.startsWith("Bearer ")
  })

  if (!process.env.N8N_API_SECRET) {
    return NextResponse.json({ hasSecret: false }, { status: 200 })
  }

  if (authHeader !== `Bearer ${process.env.N8N_API_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ hasSecret: true }, { status: 200 })
}
