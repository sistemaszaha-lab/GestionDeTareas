import { PrismaClient, UserRole } from "@prisma/client"
import { hashPassword } from "../lib/password"

const prisma = new PrismaClient()

async function main() {
  const email = "sistemaszaha@gmail.com"
  const username = "admin"
  const password = "123456789"

  console.log("[seed] Starting…")
  console.log("[seed] Admin user:", { email, username, role: "ADMIN" })

  const passwordHash = await hashPassword(password)

  // NOTE: The current Prisma `User` model in `prisma/schema.prisma` does not have an `email` field.
  // We still log the email above for clarity; `username` remains the login identifier.
  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      name: email,
      role: UserRole.ADMIN,
      passwordHash
    },
    create: {
      name: email,
      username,
      passwordHash,
      role: UserRole.ADMIN
    },
    select: { id: true, username: true, name: true, role: true, createdAt: true }
  })

  console.log("[seed] Admin upserted:", admin)
  console.log("[seed] Done.")
}

main()
  .catch((err) => {
    console.error("[seed] Failed:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

