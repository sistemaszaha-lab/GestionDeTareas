"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import toast from "react-hot-toast"
import type { UserRole } from "@prisma/client"
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
import { Select as ShadcnSelect } from "@/components/shadcn/ui/select"
import { updateUserSchema } from "@/lib/validators"
import { fetchJsonOrThrow } from "@/lib/fetch-json"

type CurrentUser = { id: string; role: "ADMIN" | "USER" }

export type EditableUser = {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  email: string
  phone: string
  username: string
  role: UserRole
}

type UpdateUserInput = {
  firstName?: string
  middleName?: string | null
  lastName?: string
  email?: string
  phone?: string
  username?: string
  role?: "admin" | "user"
  password?: string
  confirmPassword?: string
}

type FieldErrors = Partial<Record<keyof UpdateUserInput, string>>

function zodErrorsToMap(issues: Array<{ path: (string | number)[]; message: string }>) {
  const map: Record<string, string> = {}
  for (const i of issues) {
    const key = i.path.join(".")
    if (!key) continue
    if (!map[key]) map[key] = i.message
  }
  return map
}

export default function EditUserDialog({
  open,
  onOpenChange,
  currentUser,
  user,
  onUpdated
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: CurrentUser
  user: EditableUser | null
  onUpdated?: () => void
}) {
  const canAdmin = currentUser.role === "ADMIN"

  const initial = useMemo(() => {
    if (!user) {
      return {
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phone: "",
        username: "",
        role: "user" as const,
        password: "",
        confirmPassword: ""
      }
    }

    return {
      firstName: user.firstName ?? "",
      middleName: user.middleName ?? "",
      lastName: user.lastName ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      username: user.username ?? "",
      role: user.role === "ADMIN" ? ("admin" as const) : ("user" as const),
      password: "",
      confirmPassword: ""
    }
  }, [user])

  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(initial)
    setErrors({})
    setFormError("")
    setSaving(false)
  }, [open, initial])

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key as any]: undefined }))
    setFormError("")
  }

  function buildPatch(): UpdateUserInput {
    if (!user) return {}
    const patch: UpdateUserInput = {}

    const f = form.firstName.trim()
    const m = form.middleName.trim()
    const l = form.lastName.trim()
    const e = form.email.trim()
    const p = form.phone.trim()
    const u = form.username.trim()

    if (f !== (user.firstName ?? "")) patch.firstName = f
    if (m !== (user.middleName ?? "")) patch.middleName = m ? m : null
    if (l !== (user.lastName ?? "")) patch.lastName = l
    if (e !== (user.email ?? "")) patch.email = e
    if (p !== (user.phone ?? "")) patch.phone = p
    if (u.toLowerCase() !== (user.username ?? "").toLowerCase()) patch.username = u

    const nextRole: "admin" | "user" = form.role
    const currentRole: "admin" | "user" = user.role === "ADMIN" ? "admin" : "user"
    if (nextRole !== currentRole) patch.role = nextRole

    if (form.password || form.confirmPassword) {
      patch.password = form.password
      patch.confirmPassword = form.confirmPassword
    }

    return patch
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!canAdmin) return
    if (!user) return

    setSaving(true)
    setFormError("")
    setErrors({})
    try {
      const patch = buildPatch()
      const parsed = updateUserSchema.safeParse(patch)
      if (!parsed.success) {
        const mapped = zodErrorsToMap(parsed.error.issues)
        setErrors(mapped as FieldErrors)
        setFormError("Revisa los campos marcados.")
        return
      }

      await fetchJsonOrThrow<{ user: unknown }>(
        `/api/users/${user.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(parsed.data)
        },
        { defaultError: "No se pudo actualizar el usuario", logTag: "PATCH /api/users/:id" }
      )

      toast.success("Usuario actualizado")
      onOpenChange(false)
      onUpdated?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error"
      setFormError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const disableSubmit = !canAdmin || saving || !user

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>Actualiza los datos del usuario. La contraseña es opcional.</DialogDescription>
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
                  <Label htmlFor="edit-firstName">Primer nombre</Label>
                  <Input id="edit-firstName" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} autoFocus />
                  {errors.firstName ? <div className="text-xs text-red-600 dark:text-red-300">{errors.firstName}</div> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-middleName">Segundo nombre</Label>
                  <Input id="edit-middleName" value={form.middleName} onChange={(e) => setField("middleName", e.target.value)} />
                  {errors.middleName ? <div className="text-xs text-red-600 dark:text-red-300">{errors.middleName}</div> : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-lastName">Apellidos</Label>
                  <Input id="edit-lastName" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} />
                  {errors.lastName ? <div className="text-xs text-red-600 dark:text-red-300">{errors.lastName}</div> : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-email">Correo electrónico</Label>
                  <Input id="edit-email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                  {errors.email ? <div className="text-xs text-red-600 dark:text-red-300">{errors.email}</div> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Teléfono</Label>
                  <Input id="edit-phone" type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                  {errors.phone ? <div className="text-xs text-red-600 dark:text-red-300">{errors.phone}</div> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-username">Nombre de usuario</Label>
                  <Input
                    id="edit-username"
                    value={form.username}
                    onChange={(e) => setField("username", e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {errors.username ? <div className="text-xs text-red-600 dark:text-red-300">{errors.username}</div> : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-role">Rol</Label>
                  <ShadcnSelect id="edit-role" value={form.role} onChange={(e) => setField("role", e.target.value as any)}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </ShadcnSelect>
                  {errors.role ? <div className="text-xs text-red-600 dark:text-red-300">{errors.role}</div> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-password">Nueva contraseña</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder="Dejar vacío para no cambiar"
                  />
                  {errors.password ? <div className="text-xs text-red-600 dark:text-red-300">{errors.password}</div> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="edit-confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                  />
                  {errors.confirmPassword ? <div className="text-xs text-red-600 dark:text-red-300">{errors.confirmPassword}</div> : null}
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={saving}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={disableSubmit}>
                  {saving ? "Guardando…" : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}