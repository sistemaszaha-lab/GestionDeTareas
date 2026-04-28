import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function recover() {
  try {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } })
    if (!admin) {
      console.error("Error: No se encontró ningún usuario con rol ADMIN.")
      return
    }

    console.log(`Usando ADMIN: ${admin.name} (${admin.id}) para recuperación.`)

    const orphanTasks = await prisma.task.findMany({
      where: {
        assignedUsers: { none: {} }
      }
    })

    console.log(`Encontradas ${orphanTasks.length} tareas huérfanas.`)

    for (const task of orphanTasks) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          assignedUsers: {
            connect: { id: admin.id }
          }
        }
      })
    }

    console.log("Recuperación completada con éxito.")

  } catch (err) {
    console.error("Error durante la recuperación:", err)
  } finally {
    await prisma.$disconnect()
  }
}

recover()
