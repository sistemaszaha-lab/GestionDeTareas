import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"
import { restoreTaskToColumn, restoreTasks } from "@/lib/task-trash"
import { taskRestoreBulkSchema, taskRestoreSingleSchema } from "@/lib/validators"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const body = await req.json().catch(() => null)
    const parsed = taskRestoreBulkSchema.extend({ columnId: taskRestoreSingleSchema.shape.columnId.optional() }).safeParse(body)
    if (!parsed.success) return jsonError("Datos inválidos", 400)

    if (parsed.data.columnId) {
      if (parsed.data.taskIds.length !== 1) {
        return jsonError("Para restaurar a una columna específica envía una sola tarea.", 400)
      }

      const [taskId] = parsed.data.taskIds
      const result = await restoreTaskToColumn({
        user,
        taskId,
        columnId: parsed.data.columnId
      })
      return jsonOk({ ok: true, task: result.task, warnings: result.warnings })
    }

    const result = await restoreTasks({
      user,
      taskIds: parsed.data.taskIds
    })

    return jsonOk({ ok: true, tasks: result.tasks, warnings: result.warnings })
  } catch (err) {
    return jsonException(err, { route: "POST /api/tasks/trash/restore" })
  }
}
