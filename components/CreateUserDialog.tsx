"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import toast from "react-hot-toast"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/shadcn/ui/dialog"
import { Button } from "@/components/shadcn/ui/button"
import { Input } from "@/components/shadcn/ui/input"
import { Label } from "@/components/shadcn/ui/label"
import { Card, CardContent } from "@/components/shadcn/ui/card"
import { createUserSchema } from "@/lib/validators"
import { fetchJsonOrThrow } from "@/lib/fetch-json"

type CurrentUser = { id: string; role: "ADMIN" | "USER" }

type CreateUserInput = {
  firstName: string
  middleName?: string | null
  lastName: string
  email: string
  phone: string
  username: string
  password: string
  confirmPassword: string
}

type FieldErrors = Partial<Record<keyof CreateUserInput, string>>

function zodErrorsToMap(issues: Array<{ path: (string | number)[]; message: string }>) {
  const map: Record<string, string> = {}
  for (const i of issues) {
    const key = i.path.join(".")
    if (!key) continue
    if (!map[key]) map[key] = i.message
  }
  return map
}

export default function CreateUserDialog({
  open,
  onOpenChange,
  currentUser,
  onCreated
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: CurrentUser
  onCreated?: () => void
}) {
  const canAdmin = currentUser.role === "ADMIN"

  const defaultState = useMemo<CreateUserInput>(
    () => ({
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      phone: "",
      username: "",
      password: "",
      confirmPassword: ""
    }),
    []
  )

  const [form, setForm] = useState<CreateUserInput>(defaultState)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(defaultState)
    setErrors({})
    setFormError("")
    setSaving(false)
  }, [open, defaultState])

  function setField<K extends keyof CreateUserInput>(key: K, value: CreateUserInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setFormError("")
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!canAdmin) return

    setSaving(true)
    setFormError("")
    setErrors({})
    try {
      const parsed = createUserSchema.safeParse(form)
      if (!parsed.success) {
        const mapped = zodErrorsToMap(parsed.error.issues)
        setErrors(mapped as FieldErrors)
        setFormError("Revisa los campos marcados.")
        return
      }

      await fetchJsonOrThrow<{ user: unknown }>(
        "/api/users",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(parsed.data)
        },
        { defaultError: "No se pudo crear el usuario", logTag: "POST /api/users" }
      )

      toast.success("Usuario creado")
      onOpenChange(false)
      onCreated?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error"
      setFormError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const disableSubmit =
    !canAdmin ||
    saving ||
    !form.firstName.trim() ||
    !form.lastName.trim() ||
    !form.email.trim() ||
    !form.phone.trim() ||
    !form.username.trim() ||
    !form.password

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>Agrega un usuario para que pueda iniciar sesi&oacute;n y recibir tareas.</DialogDescription>
        </DialogHeader>

        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="p-0">
            <form onSubmit={submit} className="px-6 pb-2 space-y-4">
              {formError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                  {formError}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="user-firstName">Primer nombre</Label>
                  <Input
                    id="user-firstName"
                    value={form.firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                    autoFocus
                    placeholder="Ej. Juan"
                  />
                  {errors.firstName ? <div className="text-xs text-red-600 dark:text-red-300">{errors.firstName}</div> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-middleName">Segundo nombre</Label>
                  <Input
                    id="user-middleName"
                    value={form.middleName ?? ""}
                    onChange={(e) => setField("middleName", e.target.value)}
                    placeholder="Opcional"
                  />
                  {errors.middleName ? <div className="text-xs text-red-600 dark:text-red-300">{errors.middleName}</div> : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="user-lastName">Apellidos</Label>
                  <Input
                    id="user-lastName"
                    value={form.lastName}
                    onChange={(e) => setField("lastName", e.target.value)}
                    placeholder="Ej. P&eacute;rez G&oacute;mez"
                  />
                  {errors.lastName ? <div className="text-xs text-red-600 dark:text-red-300">{errors.lastName}</div> : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="user-email">Correo electr&oacute;nico</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="correo@empresa.com"
                  />
                  {errors.email ? <div className="text-xs text-red-600 dark:text-red-300">{errors.email}</div> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-phone">Tel&eacute;fono</Label>
                  <Input
                    id="user-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="55 5555 5555"
                  />
                  {errors.phone ? <div className="text-xs text-red-600 dark:text-red-300">{errors.phone}</div> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-username">Nombre de usuario</Label>
                  <Input
                    id="user-username"
                    value={form.username}
                    onChange={(e) => setField("username", e.target.value)}
                    placeholder="juan.perez"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {errors.username ? <div className="text-xs text-red-600 dark:text-red-300">{errors.username}</div> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-password">Contrase&ntilde;a</Label>
                  <Input
                    id="user-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder="M&iacute;nimo 8 caracteres"
                  />
                  {errors.password ? <div className="text-xs text-red-600 dark:text-red-300">{errors.password}</div> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-confirmPassword">Confirmar contrase&ntilde;a</Label>
                  <Input
                    id="user-confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                    placeholder="Repite la contrase&ntilde;a"
                  />
                  {errors.confirmPassword ? (
                    <div className="text-xs text-red-600 dark:text-red-300">{errors.confirmPassword}</div>
                  ) : null}
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={saving}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={disableSubmit}>
                  {saving ? "Creando…" : "Crear usuario"}
                </Button>
              </DialogFooter>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}