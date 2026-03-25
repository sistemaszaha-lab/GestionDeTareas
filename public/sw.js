const CACHE_VERSION = "v1"
const CACHE_NAME = `pwa-cache-${CACHE_VERSION}`

const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png"
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(PRECACHE_URLS)
      self.skipWaiting()
    })()
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k.startsWith("pwa-cache-") && k !== CACHE_NAME).map((k) => caches.delete(k)))
      self.clients.claim()
    })()
  )
})

function isSameOrigin(request) {
  try {
    const url = new URL(request.url)
    return url.origin === self.location.origin
  } catch {
    return false
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") return
  if (!isSameOrigin(request)) return

  const url = new URL(request.url)

  // Navigation: network-first, offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch {
          const cache = await caches.open(CACHE_NAME)
          const cached = await cache.match("/offline.html")
          return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
        }
      })()
    )
    return
  }

  // Static assets: cache-first
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"

  if (isStatic) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(request)
        if (cached) return cached

        const res = await fetch(request)
        if (res.ok) cache.put(request, res.clone())
        return res
      })()
    )
  }
})