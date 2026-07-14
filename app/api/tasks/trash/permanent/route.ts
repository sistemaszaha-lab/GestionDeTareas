import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { permanentlyDeleteTasks } from "@/lib/task-trash"
import { taskPermanentDeleteSchema } from "@/lib/validators"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const body = await req.json().catch(() => null)
    const parsed = taskPermanentDeleteSchema.safeParse(body)
    if (!parsed.success) return jsonError("Datos inválidos", 400)

    const result = await permanentlyDeleteTasks({
      user,
      taskIds: parsed.data.taskIds
    })

    return jsonOk({ ok: true, deletedCount: result.deletedCount, warnings: result.warnings })
  } catch (err) {
    return jsonException(err, { route: "POST /api/tasks/trash/permanent" })
  }
}
