import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/server-auth"
import { jsonError, jsonException, jsonOk } from "@/lib/http"
import { isAdmin, taskByIdWhere } from "@/lib/task-permissions"
import fs from "fs/promises"
import path from "path"
import crypto from "crypto"

export const runtime = "nodejs"

type Attachment = {
  id: string
  name: string
  url: string
  type: "file" | "link"
  fileType?: string
  createdAt: string
}

function getFiles(formData: FormData) {
  const multipleFiles = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0)

  if (multipleFiles.length > 0) return multipleFiles

  const singleFile = formData.get("file")
  if (singleFile instanceof File && singleFile.size > 0) return [singleFile]

  return []
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(req)
    if (!user) return jsonError("Unauthorized", 401)

    const { id: taskId } = await Promise.resolve(ctx.params)
    const task = await prisma.task.findFirst({
      where: taskByIdWhere(user, taskId),
      include: { assignedUsers: { select: { id: true } } }
    })
    if (!task) return jsonError("Tarea no encontrada", 404)

    const canEdit = isAdmin(user) || task.assignedUsers.some((u) => u.id === user.id)
    if (!canEdit) return jsonError("No tienes permisos para adjuntar archivos a esta tarea", 403)

    const formData = await req.formData()
    const files = getFiles(formData)
    const linkUrl = formData.get("url") as string | null
    const linkName = formData.get("name") as string | null

    const newAttachments: Attachment[] = []

    if (files.length > 0) {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          return jsonError("El archivo excede el límite de 5MB", 400)
        }
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads")

      try {
        await fs.access(uploadDir)
      } catch {
        await fs.mkdir(uploadDir, { recursive: true })
      }

      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer())
        const ext = path.extname(file.name)
        const filename = `${crypto.randomUUID()}${ext}`
        const filepath = path.join(uploadDir, filename)
        await fs.writeFile(filepath, buffer)

        newAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          url: `/uploads/${filename}`,
          type: "file",
          fileType: file.type,
          createdAt: new Date().toISOString()
        })
      }
    } else if (linkUrl && linkName) {
      newAttachments.push({
        id: crypto.randomUUID(),
        name: linkName,
        url: linkUrl,
        type: "link",
        createdAt: new Date().toISOString()
      })
    } else {
      return jsonError("Datos inválidos", 400)
    }

    const currentAttachments = Array.isArray(task.attachments) ? (task.attachments as Attachment[]) : []
    const updatedAttachments = [...currentAttachments, ...newAttachments]

    await prisma.task.update({
      where: { id: taskId },
      data: { attachments: updatedAttachments }
    })

    return jsonOk({
      attachment: newAttachments[0] ?? null,
      attachments: updatedAttachments
    })
  } catch (err) {
    return jsonException(err, { route: "POST /api/tasks/[id]/attachments" })
  }
}
