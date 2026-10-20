import { prisma } from "@/lib/prisma"
import { buildReminderNotifications } from "@/lib/task-reminders"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const secret = process.env.N8N_API_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { not: "DONE" }
      },
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        status: true,
        deletedAt: true,
        assignedUsers: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { dueDate: "asc" }
    })

    const result = buildReminderNotifications(tasks)
    const pending = result.notifications
      .filter((notification) => notification.type === "PENDING")
      .map((notification) => notification.task)

    return NextResponse.json(
      {
        notifications: result.notifications,
        pending,
        dueToday: result.dueToday,
        upcoming: result.upcoming
      },
      { status: 200 }
    )
  } catch (err) {
    console.error("[GET /api/tasks/reminders] Error", {
      message: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
