import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/server-auth";
import { jsonError, jsonException, jsonOk } from "@/lib/http";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { id: taskId } = await Promise.resolve(ctx.params);
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return jsonError("Tarea no encontrada", 404);

    const canEdit = user.role === "ADMIN" || task.assignedToId === user.id;
    if (!canEdit) return jsonError("No tienes permisos para adjuntar archivos a esta tarea", 403);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const linkUrl = formData.get("url") as string | null;
    const linkName = formData.get("name") as string | null;

    let newAttachment: any = null;

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return jsonError("El archivo excede el límite de 5MB", 400);
      }
      
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      
      try {
        await fs.access(uploadDir);
      } catch {
        await fs.mkdir(uploadDir, { recursive: true });
      }

      const ext = path.extname(file.name);
      const filename = `${crypto.randomUUID()}${ext}`;
      const filepath = path.join(uploadDir, filename);
      await fs.writeFile(filepath, buffer);

      newAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        url: `/uploads/${filename}`,
        type: "file",
        fileType: file.type,
        createdAt: new Date().toISOString()
      };
    } else if (linkUrl && linkName) {
      newAttachment = {
        id: crypto.randomUUID(),
        name: linkName,
        url: linkUrl,
        type: "link",
        createdAt: new Date().toISOString()
      };
    } else {
      return jsonError("Datos inválidos", 400);
    }

    const currentAttachments = Array.isArray(task.attachments) ? task.attachments : [];
    const updatedAttachments = [...currentAttachments, newAttachment];

    await prisma.task.update({
      where: { id: taskId },
      data: { attachments: updatedAttachments }
    });

    return jsonOk({ attachment: newAttachment });
  } catch (err) {
    return jsonException(err, { route: "POST /api/tasks/[id]/attachments" });
  }
}
