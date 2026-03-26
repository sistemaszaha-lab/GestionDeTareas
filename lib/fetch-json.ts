export type FetchJsonOrThrowOptions = {
  defaultError?: string
  logTag?: string
}

function isLikelyHtml(text: string) {
  const t = text.trim().toLowerCase()
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.startsWith("<head") || t.startsWith("<body")
}

function looksLikeJson(text: string) {
  const t = text.trim()
  return t.startsWith("{") || t.startsWith("[")
}

function truncate(text: string, max = 500) {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

function requestLabel(input: RequestInfo | URL, init?: RequestInit, tag?: string) {
  const method = (init?.method ?? "GET").toUpperCase()

  let url = ""
  try {
    if (typeof input === "string") url = input
    else if (input instanceof URL) url = input.toString()
    else if (typeof (input as any)?.url === "string") url = (input as any).url
    else url = "(unknown-url)"
  } catch {
    url = "(unknown-url)"
  }

  const base = `${method} ${url}`
  return tag ? `${tag} (${base})` : base
}

function logApiError(kind: string, info: Record<string, unknown>) {
  // Keep it consistent and easy to grep in browser/terminal.
  console.error(`[api] ${kind}`, info)
}

export async function fetchJsonOrThrow<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts?: FetchJsonOrThrowOptions
): Promise<T> {
  const label = requestLabel(input, init, opts?.logTag)

  let res: Response
  try {
    res = await fetch(input, init)
  } catch (err) {
    logApiError("network", {
      label,
      message: err instanceof Error ? err.message : String(err)
    })
    throw new Error("No se pudo conectar con la API. Revisa tu conexión e inténtalo de nuevo.")
  }

  const status = res.status
  const statusText = res.statusText
  const contentType = (res.headers.get("content-type") ?? "").toLowerCase()

  const text = await res.text().catch(() => "")
  const mayBeJson = contentType.includes("application/json") || contentType.includes("+json") || looksLikeJson(text)

  let json: any = null
  if (text && mayBeJson) {
    try {
      json = JSON.parse(text)
    } catch (err) {
      logApiError("json-parse", {
        label,
        status,
        contentType,
        message: err instanceof Error ? err.message : String(err),
        bodySnippet: truncate(text)
      })
      json = null
    }
  }

  if (!res.ok) {
    const apiError = typeof json?.error === "string" ? json.error : null
    const fallbackText = !mayBeJson && !isLikelyHtml(text) ? text.trim() : ""
    const message =
      apiError ||
      fallbackText ||
      opts?.defaultError ||
      (statusText ? `${statusText} (${status})` : `Error (${status})`)

    logApiError("http", {
      label,
      status,
      statusText,
      contentType,
      apiError,
      bodySnippet: truncate(text)
    })

    throw new Error(message)
  }

  if (status === 204) return undefined as T
  if (!text.trim()) return {} as T

  if (json === null) {
    logApiError("non-json", {
      label,
      status,
      contentType,
      bodySnippet: truncate(text)
    })
    throw new Error("La API devolvió una respuesta no válida.")
  }

  return json as T
}
