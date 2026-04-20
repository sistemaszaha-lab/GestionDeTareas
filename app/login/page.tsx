"use client"

import { Suspense } from "react"
import { useMemo, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { signIn } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Button } from "@/components/shadcn/ui/button"
import { Input } from "@/components/shadcn/ui/input"
import { Label } from "@/components/shadcn/ui/label"
import { fetchJsonOrThrow } from "@/lib/fetch-json"

const ALLOWED_GOOGLE_DOMAIN = "tuempresa.com"

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.66 12.23c0-.74-.07-1.45-.21-2.14H12v4.06h5.74c-.25 1.35-1.02 2.49-2.17 3.25v2.7h3.52c2.07-1.9 3.27-4.71 3.27-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.94 0 5.41-.97 7.21-2.63l-3.52-2.7c-.98.66-2.24 1.05-3.69 1.05-2.84 0-5.25-1.92-6.11-4.51H2.25v2.82C3.98 20.96 7.72 23 12 23Z"
      />
      <path fill="#FBBC05" d="M5.89 14.21a7.38 7.38 0 0 1 0-4.42V7.0H2.25a11.99 11.99 0 0 0 0 10.0l3.64-2.79Z" />
      <path
        fill="#EA4335"
        d="M12 4.76c1.6 0 3.04.55 4.17 1.64l3.12-3.12C17.38 1.21 14.94 0 12 0 7.72 0 3.98 2.04 2.25 5.82l3.64 2.82C6.75 6.68 9.16 4.76 12 4.76Z"
      />
    </svg>
  )
}

function LoginFallback() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-5 sm:p-6 shadow-sm">
        <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-6 space-y-3">
          <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </main>
  )
}

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = useMemo(() => searchParams.get("next") ?? "/dashboard", [searchParams])
  const authError = useMemo(() => searchParams.get("error"), [searchParams])

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const authErrorMessage = useMemo(() => {
    if (!authError) return null
    if (authError === "invalid_domain") return `Solo se permiten correos @${ALLOWED_GOOGLE_DOMAIN}.`
    if (authError === "google_no_email") return "No pudimos leer tu correo desde Google. Intenta de nuevo."
    if (authError === "google_unverified") return "Tu correo de Google no está verificado."
    if (authError === "AccessDenied") return `Acceso denegado. Solo se permiten correos @${ALLOWED_GOOGLE_DOMAIN}.`
    return "No se pudo iniciar sesión con Google. Intenta de nuevo."
  }, [authError])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetchJsonOrThrow<{ ok: true }>(
        "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        },
        { defaultError: "No se pudo iniciar sesión", logTag: "POST /api/auth/login" }
      )

      toast.success("Bienvenido")
      router.replace(nextPath)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle>Iniciar sesión</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {authErrorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              {authErrorMessage}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu_usuario"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Iniciar sesión"}
            </Button>
          </form>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-slate-950/40 px-2 text-xs text-slate-500 dark:text-slate-400">o</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            disabled={loading}
          >
            <GoogleIcon />
            Continuar con Google
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginInner />
    </Suspense>
  )
}
