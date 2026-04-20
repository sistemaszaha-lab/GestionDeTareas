"use client"

import { useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Button } from "@/components/shadcn/ui/button"
import { Input } from "@/components/shadcn/ui/input"
import { Label } from "@/components/shadcn/ui/label"
import { fetchJsonOrThrow } from "@/lib/fetch-json"

export default function CompleteProfileClient({
  email,
  defaultName
}: {
  email: string
  defaultName: string
}) {
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [name, setName] = useState(defaultName)
  const [saving, setSaving] = useState(false)

  const usernameHint = useMemo(() => {
    const base = email.split("@")[0] ?? ""
    const cleaned = base.toLowerCase().replace(/[^a-z0-9._-]+/g, "").slice(0, 32)
    return cleaned ? `Sugerencia: ${cleaned}` : ""
  }, [email])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const u = username.trim()
    if (!u) return toast.error("Username requerido")
    if (!password) return toast.error("Contraseña requerida")
    if (password !== confirmPassword) return toast.error("Las contraseñas no coinciden")

    setSaving(true)
    try {
      await fetchJsonOrThrow<{ ok: true }>(
        "/api/auth/complete-profile",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: u,
            password,
            confirmPassword,
            phone: phone.trim() ? phone.trim() : null,
            name: name.trim() ? name.trim() : null
          })
        },
        { defaultError: "No se pudo completar el registro", logTag: "POST /api/auth/complete-profile" }
      )

      // Fuerza recalcular sesión/token tras crear el usuario en DB.
      await fetch("/api/auth/session").catch(() => null)

      toast.success("Registro completado")
      router.replace("/dashboard")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle>Completa tu registro</CardTitle>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Estás registrando: <span className="font-medium text-slate-900 dark:text-slate-50">{email}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cp-username">Username</Label>
              <Input
                id="cp-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu_usuario"
                autoComplete="username"
                required
              />
              {usernameHint ? <div className="text-xs text-slate-600 dark:text-slate-400">{usernameHint}</div> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cp-password">Contraseña</Label>
              <Input
                id="cp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cp-confirm">Confirmar contraseña</Label>
              <Input
                id="cp-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cp-phone">Teléfono (opcional)</Label>
                <Input id="cp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="664..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-name">Nombre (opcional)</Label>
                <Input id="cp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Guardando..." : "Continuar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

