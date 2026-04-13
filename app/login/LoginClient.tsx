"use client"

import { useMemo, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { signIn } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Button } from "@/components/shadcn/ui/button"
import { Input } from "@/components/shadcn/ui/input"
import { Label } from "@/components/shadcn/ui/label"
import { fetchJsonOrThrow } from "@/lib/fetch-json"

export default function LoginClient({
  googleEnabled,
  allowedGoogleDomain
}: {
  googleEnabled: boolean
  allowedGoogleDomain: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = useMemo(() => searchParams.get("next") ?? "/dashboard", [searchParams])
  const authError = useMemo(() => searchParams.get("error"), [searchParams])

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const authErrorMessage = useMemo(() => {
    if (!authError) return null
    if (authError === "invalid_domain") {
      return allowedGoogleDomain
        ? `Solo se permiten correos @${allowedGoogleDomain}.`
        : "Solo se permiten correos del dominio corporativo."
    }
    if (authError === "google_no_email") return "No pudimos leer tu correo desde Google. Intenta de nuevo."
    if (authError === "google_unverified") return "Tu correo de Google no está verificado."
    if (authError === "AccessDenied") {
      return allowedGoogleDomain
        ? `Acceso denegado. Solo se permiten correos @${allowedGoogleDomain}.`
        : "Acceso denegado."
    }
    return "No se pudo iniciar sesión con Google. Intenta de nuevo."
  }, [authError, allowedGoogleDomain])

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

  async function onGoogle() {
    if (!googleEnabled) return
    setGoogleLoading(true)
    try {
      await signIn("google", { callbackUrl: nextPath })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
      setGoogleLoading(false)
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

          {googleEnabled ? (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white dark:bg-slate-950/40 px-2 text-xs text-slate-500 dark:text-slate-400">o</span>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={onGoogle} disabled={googleLoading || loading}>
                {googleLoading ? "Conectando..." : "Continuar con Google"}
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
