"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { signIn } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Button } from "@/components/shadcn/ui/button"
import { Input } from "@/components/shadcn/ui/input"
import { Label } from "@/components/shadcn/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = useMemo(() => searchParams.get("next") ?? "/dashboard", [searchParams])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar sesión")
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
    setGoogleLoading(true)
    try {
      await signIn("google", { callbackUrl: nextPath })
    } catch (err) {
      setGoogleLoading(false)
      toast.error(err instanceof Error ? err.message : "Error")
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-white to-slate-50">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle>Bienvenido</CardTitle>
          <CardDescription>Accede a tu cuenta para continuar.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
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

            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading ? "Entrando..." : "Iniciar sesión"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 tracking-wide">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-3 group"
            onClick={onGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <svg className="h-5 w-5 animate-spin text-slate-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path
                  className="opacity-80"
                  fill="currentColor"
                  d="M22 12a10 10 0 0 1-10 10v-3a7 7 0 0 0 7-7h3z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 transition-transform duration-200 ease-out group-hover:scale-110"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  fill="#FFC107"
                  d="M43.611 20.083H42V20H24v8h11.303C33.65 32.657 29.198 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.019 6.053 29.291 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917Z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306 14.691 12.88 19.51C14.658 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.019 6.053 29.291 4 24 4 16.317 4 9.656 8.337 6.306 14.691Z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.189 0 9.832-1.984 13.368-5.209l-6.179-5.226C29.113 35.158 26.702 36 24 36c-5.177 0-9.614-3.316-11.271-7.946l-6.525 5.027C9.51 39.556 16.227 44 24 44Z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611 20.083H42V20H24v8h11.303a12.06 12.06 0 0 1-4.114 5.565l.003-.002 6.179 5.226C36.936 40.205 44 35 44 24c0-1.341-.138-2.651-.389-3.917Z"
                />
              </svg>
            )}

            <span className="font-semibold tracking-[-0.01em]">
              {googleLoading ? "Conectando..." : "Continuar con Google"}
            </span>
          </Button>

          <p className="text-xs text-slate-400 text-center leading-relaxed">
            Al continuar, aceptas las políticas internas de acceso de tu organización.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
