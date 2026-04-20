import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

export const runtime = "nodejs"

const allowedDomain = "@comerciointeligentebc.com"

const completeProfileSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(64)
      .regex(/^[a-zA-Z0-9._-]+$/, "Username inválido"),
    password: z.string().min(8).max(200),
    confirmPassword: z.string().min(8).max(200),
    phone: z.string().trim().min(7).max(32).optional().nullable(),
    name: z.string().trim().min(2).max(200).optional().nullable()
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Las contraseñas no coinciden" })
    }
  })

function splitName(full: string | null | undefined) {
  const raw = (full ?? "").trim().replace(/\s+/g, " ")
  if (!raw) return { firstName: "Usuario", middleName: null as string | null, lastName: "Google" }
  const parts = raw.split(" ").filter(Boolean)
  const firstName = parts[0] ?? "Usuario"
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "Google"
  const middle = parts.length > 2 ? parts.slice(1, -1).join(" ") : ""
  return { firstName, middleName: middle ? middle : null, lastName }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions).catch(() => null)
  const sUser = session?.user as any

  const email = typeof sUser?.email === "string" ? sUser.email.toLowerCase().trim() : ""
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!email.endsWith(allowedDomain)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = completeProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) return NextResponse.json({ ok: true })

  const desiredUsername = parsed.data.username.trim()
  const usernameExists = await prisma.user.findFirst({
    where: { username: { equals: desiredUsername, mode: "insensitive" } },
    select: { id: true }
  })
  if (usernameExists) return NextResponse.json({ error: "Username ya está en uso" }, { status: 409 })

  const nameInput = parsed.data.name ?? (typeof sUser?.name === "string" ? sUser.name : "")
  const { firstName, middleName, lastName } = splitName(nameInput)
  const fullName = `${firstName}${middleName ? ` ${middleName}` : ""} ${lastName}`.trim()

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  const newUser = await prisma.user.create({
    data: {
      email,
      username: desiredUsername,
      password: passwordHash,
      role: "USER",
      phone: parsed.data.phone?.trim() ? parsed.data.phone.trim() : "",
      name: fullName,
      firstName,
      middleName,
      lastName
    }
  })

  return NextResponse.json({ 
    ok: true,
    userId: newUser.id,
    message: "Perfil completado exitosamente"
  })
}


