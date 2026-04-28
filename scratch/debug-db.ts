import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function debug() {
  try {
    const taskCount = await prisma.task.count()
    const userCount = await prisma.user.count()
    console.log(`Debug DB State:`)
    console.log(`- Total Tasks: ${taskCount}`)
    console.log(`- Total Users: ${userCount}`)

    if (taskCount > 0) {
      const firstTasks = await prisma.task.findMany({
        take: 5,
        include: {
          assignedUsers: { select: { id: true, name: true } }
        }
      })
      console.log(`\nSample Tasks:`)
      firstTasks.forEach(t => {
        console.log(`[${t.id}] ${t.title} - Status: ${t.status} - Assigned: ${t.assignedUsers.length} users`)
        if (t.assignedUsers.length > 0) {
          console.log(`  Assigned IDs: ${t.assignedUsers.map(u => u.id).join(", ")}`)
        }
      })
    }

    const firstUsers = await prisma.user.findMany({ take: 3, select: { id: true, name: true, username: true } })
    console.log(`\nSample Users:`)
    console.log(JSON.stringify(firstUsers, null, 2))

  } catch (err) {
    console.error("Debug Error:", err)
  } finally {
    await prisma.$disconnect()
  }
}

debug()
