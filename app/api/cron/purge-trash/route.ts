import { NextResponse } from "next/server"
import { purgeExpiredTrash } from "@/lib/task-trash"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const secret = process.env.CRON_SECRET

    if (!secret) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await purgeExpiredTrash()

    return NextResponse.json(
      {
        ok: true,
        deletedCount: result.deletedCount,
        batches: result.batches,
        warningsCount: result.warnings.length
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[POST /api/cron/purge-trash] Error", {
      message: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
