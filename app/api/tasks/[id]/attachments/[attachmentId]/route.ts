import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/server-auth";
import { jsonError, jsonException, jsonOk } from "@/lib/http";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

type Attachment = {
  id: string
  name: string
  url: string
  type: "file" | "link"
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string, attachmentId: string }> }) {
  try {
    const user = await requireSession(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { id: taskId, attachmentId } = await Promise.resolve(ctx.params);
    const task = await prisma.task.findUnique({ 
      where: { id: taskId },
      include: { assignedUsers: { select: { id: true } } }
    });
    if (!task) return jsonError("Tarea no encontrada", 404);

    const canEdit = user.role === "ADMIN" || task.assignedUsers.some((u) => u.id === user.id);
    if (!canEdit) return jsonError("No tienes permisos para modificar esta tarea", 403);

    const attachments = Array.isArray(task.attachments) ? (task.attachments as Attachment[]) : [];
    const attachmentToDelete = attachments.find((a) => a.id === attachmentId);

    if (!attachmentToDelete) {
      return jsonError("Adjunto no encontrado", 404);
    }

    // Opcional: borrar el archivo físico
    if (attachmentToDelete?.type === "file") {
      const filename = path.basename(attachmentToDelete.url);
      const filepath = path.join(process.cwd(), "public", "uploads", filename);
      try {
        await fs.unlink(filepath);
      } catch (e) {
        console.error("No se pudo borrar el archivo físico", e);
      }
    }

    const updatedAttachments = attachments.filter((a) => a.id !== attachmentId);

    await prisma.task.update({
      where: { id: taskId },
      data: { attachments: updatedAttachments }
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return jsonException(err, { route: "DELETE /api/tasks/[id]/attachments/[attachmentId]" });
  }
}
