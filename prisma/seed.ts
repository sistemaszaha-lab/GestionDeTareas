import { PrismaClient, UserRole } from "@prisma/client"
import { hashPassword } from "../lib/password"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "sistemaszaha@gmail.com"
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin"
  const password = process.env.SEED_ADMIN_PASSWORD ?? "123456789"

  console.log("[seed] Starting…")
  console.log("[seed] Admin user:", { email, username, role: "ADMIN" })

  const passwordHash = await hashPassword(password)

  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      name: "Admin",
      firstName: "Admin",
      middleName: null,
      lastName: "Sistema",
      email,
      phone: "0000000000",
      role: UserRole.ADMIN,
      password: passwordHash
    },
    create: {
      name: "Admin",
      firstName: "Admin",
      middleName: null,
      lastName: "Sistema",
      email,
      phone: "0000000000",
      username,
      password: passwordHash,
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