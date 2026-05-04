import { prisma } from "@/lib/prisma"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { requireSession } from "@/lib/server-auth"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    // Calculate time threshold: today or tomorrow (end of tomorrow)
    const now = new Date()
    const endOfTomorrow = new Date(now)
    endOfTomorrow.setDate(now.getDate() + 1)
    endOfTomorrow.setHours(23, 59, 59, 999)

    console.log(`[GET /api/tasks/reminders] Filtering tasks due before ${endOfTomorrow.toISOString()}`)

    const tasks = await prisma.task.findMany({
      where: {
        status: { not: "DONE" },
        reminderSent: false,
        dueDate: {
          lte: endOfTomorrow
        },
        // Only return assigned tasks if not admin, or keep it system-wide for n8n?
        // User request says "n8n", which usually implies a system job.
        // However, I'll keep the session check but allow ADMIN to see everything.
        ...(user.role !== "ADMIN" ? { assignedUsers: { some: { id: user.id } } } : {})
      },
      include: {
        assignedUsers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { dueDate: "asc" }
    })

    // Flatten structure for n8n optimization
    // Each entry represents a unique task-user combination
    const flatResults = tasks.flatMap(task => 
      task.assignedUsers.map(assignedUser => ({
        taskId: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString(),
        userName: assignedUser.name,
        userEmail: assignedUser.email,
        userPhone: assignedUser.phone,
        // Helper fields for n8n
        status: task.status,
        isOverdue: task.dueDate ? new Date(task.dueDate) < now : false
      }))
    )

    console.log(`[GET /api/tasks/reminders] Found ${tasks.length} tasks, generated ${flatResults.length} notification items`)

    return jsonOk(flatResults)
  } catch (err) {
    return jsonException(err, { route: "GET /api/tasks/reminders" })
  }
}
