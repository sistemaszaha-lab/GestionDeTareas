import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    console.log("N8N ENV loaded:", !!process.env.N8N_API_SECRET)

    const authHeader = req.headers.get("authorization")
    console.log("[GET /api/tasks/reminders] Authorization header recibido", {
      present: Boolean(authHeader),
      scheme: authHeader?.split(" ")?.[0] ?? null
    })

    if (!process.env.N8N_API_SECRET) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${process.env.N8N_API_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)

    const endOfUpcomingWindow = new Date(startOfToday)
    endOfUpcomingWindow.setDate(endOfUpcomingWindow.getDate() + 7)
    endOfUpcomingWindow.setHours(23, 59, 59, 999)

    console.log("[GET /api/tasks/reminders] Ventana de recordatorios", {
      startOfToday: startOfToday.toISOString(),
      endOfToday: endOfToday.toISOString(),
      endOfUpcomingWindow: endOfUpcomingWindow.toISOString()
    })

    const tasks = await prisma.task.findMany({
      where: {
        status: { not: "DONE" }
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

    const pending = tasks
      .filter(task => !task.dueDate)
      .flatMap(task =>
        task.assignedUsers.map(assignedUser => ({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: null,
          assignedUser: {
            id: assignedUser.id,
            name: assignedUser.name,
            email: assignedUser.email,
            phone: assignedUser.phone
          }
        }))
      )

    const dueToday = tasks
      .filter(task => task.dueDate && task.dueDate >= startOfToday && task.dueDate <= endOfToday)
      .flatMap(task =>
        task.assignedUsers.map(assignedUser => ({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: task.dueDate?.toISOString() ?? null,
          assignedUser: {
            id: assignedUser.id,
            name: assignedUser.name,
            email: assignedUser.email,
            phone: assignedUser.phone
          }
        }))
      )

    const upcoming = tasks
      .filter(task => task.dueDate && task.dueDate > endOfToday && task.dueDate <= endOfUpcomingWindow)
      .flatMap(task =>
        task.assignedUsers.map(assignedUser => ({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: task.dueDate?.toISOString() ?? null,
          assignedUser: {
            id: assignedUser.id,
            name: assignedUser.name,
            email: assignedUser.email,
            phone: assignedUser.phone
          }
        }))
      )

    console.log("[GET /api/tasks/reminders] Resultados", {
      tasksFetched: tasks.length,
      pending: pending.length,
      dueToday: dueToday.length,
      upcoming: upcoming.length
    })

    return NextResponse.json(
      {
        pending,
        dueToday,
        upcoming
      },
      { status: 200 }
    )
  } catch (err) {
    console.log("[GET /api/tasks/reminders] Error", {
      message: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
