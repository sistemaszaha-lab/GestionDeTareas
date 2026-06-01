import fs from "fs/promises"
import path from "path"

export const runtime = "nodejs"

const CONTENT_TYPES: Record<string, string> = {
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm"
}

function contentTypeFor(filename: string) {
  return CONTENT_TYPES[path.extname(filename).toLowerCase()] ?? "application/octet-stream"
}

export async function GET(_: Request, ctx: { params: Promise<{ filename: string }> }) {
  const { filename } = await Promise.resolve(ctx.params)
  const safeFilename = path.basename(filename)
  if (!safeFilename || safeFilename !== filename) {
    return new Response("Not found", { status: 404 })
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads")
  const filePath = path.join(uploadDir, safeFilename)
  const resolvedUploadDir = path.resolve(uploadDir) + path.sep
  const resolvedFilePath = path.resolve(filePath)

  if (!resolvedFilePath.startsWith(resolvedUploadDir)) {
    return new Response("Not found", { status: 404 })
  }

  try {
    const data = await fs.readFile(resolvedFilePath)
    return new Response(data, {
      headers: {
        "Content-Type": contentTypeFor(safeFilename),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${safeFilename}"`
      }
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
