import { NextResponse } from "next/server"

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, status: init?.status ?? 200 })
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isPrismaServiceUnavailable(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)

  // Common Prisma/DB connectivity and initialization failures.
  if (message.includes("Environment variable not found: DATABASE_URL")) return true
  if (message.includes("PrismaClientInitializationError")) return true
  if (message.includes("Can't reach database server")) return true
  if (message.includes("P1001") || message.includes("P1002")) return true
  if (message.includes("ECONNREFUSED") || message.includes("ETIMEDOUT")) return true

  return false
}

function summarizeNonJsonError(text: string) {
  const t = text.trim()
  if (!t) return null
  const lower = t.toLowerCase()
  if (lower.startsWith("<!doctype") || lower.startsWith("<html")) return null
  if (t.length > 220) return null
  return t
}

/**
 * Standard API exception handler to avoid HTML/text responses on crashes.
 * Always returns JSON and logs a stable errorId for debugging.
 */
export function jsonException(err: unknown, opts?: { route?: string }) {
  const errorId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const message = err instanceof Error ? err.message : String(err)

  console.error("API error", {
    errorId,
    route: opts?.route,
    name: err instanceof Error ? err.name : "Unknown",
    message
  })

  if (message.includes("Environment variable not found: DATABASE_URL")) {
    return jsonError("Configuración inválida del servidor (DATABASE_URL faltante)", 500)
  }

  if (isPrismaServiceUnavailable(err)) {
    return jsonError("Servicio no disponible. Intenta de nuevo en unos minutos.", 503)
  }

  const brief = summarizeNonJsonError(message)
  if (brief && brief.toLowerCase().includes("service unavailable")) {
    return jsonError("Servicio no disponible. Intenta de nuevo en unos minutos.", 503)
  }

  return jsonError(`Error interno (ref: ${errorId})`, 500)
}
