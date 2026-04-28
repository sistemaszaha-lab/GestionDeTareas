import { prisma } from "../lib/prisma"

async function testApi() {
  const tasks = await prisma.task.findMany({
    include: {
      assignedUsers: { select: { id: true, name: true, username: true, role: true } },
      comments: {
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  })
  console.log(`API Task Count: ${tasks.length}`)
  if (tasks.length > 0) {
    console.log(`First task assigned users: ${tasks[0].assignedUsers.length}`)
  }
}

testApi().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); })
