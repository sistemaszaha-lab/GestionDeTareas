"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import type { UserRole } from "@prisma/client"
import { Button } from "@/components/shadcn/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/ui/table"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/shadcn/ui/dialog"
import { fetchJsonOrThrow } from "@/lib/fetch-json"
import CreateUserDialog from "@/components/CreateUserDialog"
import EditUserDialog from "@/components/EditUserDialog"

type CurrentUser = { id: string; name: string; username: string; role: "ADMIN" | "USER" }

type UserRow = {
  id: string
  name: string
  firstName: string
  middleName: string | null
  lastName: string
  email: string
  phone: string
  username: string
  role: UserRole
  createdAt: string | Date
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={[
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className ?? ""
      ].join(" ")}
      aria-hidden="true"
    />
  )
}

function roleBadge(role: UserRole) {
  return (
    <Badge variant={role === "ADMIN" ? "success" : "secondary"}>
      {role === "ADMIN" ? "Admin" : "User"}
    </Badge>
  )
}

function fullName(u: Pick<UserRow, "firstName" | "middleName" | "lastName" | "name">) {
  const candidate = [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ").trim()
  return candidate || u.name
}

export default function UsersClient({ currentUser }: { currentUser: CurrentUser }) {
  const canAdmin = currentUser.role === "ADMIN"
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => {
      const an = fullName(a).toLowerCase()
      const bn = fullName(b).toLowerCase()
      return an.localeCompare(bn)
    })
  }, [users])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchJsonOrThrow<{ users: UserRow[] }>(
        "/api/users",
        { cache: "no-store" },
        { defaultError: "No se pudieron cargar usuarios", logTag: "GET /api/users" }
      )
      setUsers(data.users ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function openEdit(u: UserRow) {
    if (!canAdmin) return
    setEditUser(u)
    setEditOpen(true)
  }

  function openDelete(u: UserRow) {
    if (!canAdmin) return
    setDeleteUser(u)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deleteUser) return

    setDeleting(true)
    setBusyUserId(deleteUser.id)
    try {
      await fetchJsonOrThrow<{ ok: true }>(
        `/api/users/${deleteUser.id}`,
        { method: "DELETE" },
        { defaultError: "No se pudo eliminar el usuario", logTag: "DELETE /api/users/:id" }
      )
      toast.success("Usuario eliminado")
      setDeleteOpen(false)
      setDeleteUser(null)
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id))
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally {
      setDeleting(false)
      setBusyUserId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900 dark:text-slate-50">Usuarios</h1>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Administra los usuarios del sistema.
            {!loading ? <span className="ml-2 text-slate-500 dark:text-slate-400">({sorted.length})</span> : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="h-3.5 w-3.5" />
                Cargando...
              </span>
            ) : (
              "Refrescar"
            )}
          </Button>
          <Button onClick={() => setCreateOpen(true)} disabled={!canAdmin}>
            Nuevo usuario
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-5 sm:p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!loading && sorted.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-10 text-center">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-50">No hay usuarios</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Crea el primer usuario para empezar.</div>
            <div className="mt-4">
              <Button onClick={() => setCreateOpen(true)} disabled={!canAdmin}>
                Crear usuario
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!loading && sorted.length > 0 ? (
        <>
          <div className="hidden md:block">
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((u) => (
                  <TableRow key={u.id} className={u.id === currentUser.id ? "bg-slate-50/70 dark:bg-slate-900/30" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-50 truncate">{fullName(u)}</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{u.name}</div>
                        </div>
                        {u.id === currentUser.id ? (
                          <Badge variant="outline" className="shrink-0">
                            TÃº
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{u.username}</TableCell>
                    <TableCell className="truncate max-w-[26ch]">{u.email}</TableCell>
                    <TableCell>{u.phone}</TableCell>
                    <TableCell>{roleBadge(u.role)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)} disabled={!canAdmin || Boolean(busyUserId)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => openDelete(u)}
                          disabled={!canAdmin || (Boolean(busyUserId) && busyUserId !== u.id)}
                        >
                          {busyUserId === u.id ? (
                            <span className="inline-flex items-center gap-2">
                              <Spinner className="h-3.5 w-3.5" />
                              Eliminando...
                            </span>
                          ) : (
                            "Eliminar"
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {sorted.map((u) => (
              <Card key={u.id} className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <CardTitle className="text-base truncate">{fullName(u)}</CardTitle>
                        {u.id === currentUser.id ? (
                          <Badge variant="outline" className="shrink-0">
                            TÃº
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 truncate">@{u.username}</div>
                    </div>
                    {roleBadge(u.role)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600 dark:text-slate-400">Email</span>
                    <span className="truncate max-w-[65%]">{u.email}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600 dark:text-slate-400">Teléfono</span>
                    <span className="truncate max-w-[65%]">{u.phone}</span>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEdit(u)}
                      disabled={!canAdmin || Boolean(busyUserId)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="flex-1"
                      onClick={() => openDelete(u)}
                      disabled={!canAdmin || (Boolean(busyUserId) && busyUserId !== u.id)}
                    >
                      {busyUserId === u.id ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner className="h-3.5 w-3.5" />
                          Eliminando...
                        </span>
                      ) : (
                        "Eliminar"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} currentUser={currentUser} onCreated={refresh} />

      <EditUserDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          if (!o) setEditUser(null)
        }}
        currentUser={currentUser}
        user={editUser}
        onUpdated={refresh}
      />

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o)
          if (!o) setDeleteUser(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Si el usuario tiene tareas asignadas u otros registros relacionados, el sistema
              podría impedir la eliminación.
            </DialogDescription>
          </DialogHeader>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-4 text-sm">
              <div className="text-slate-600 dark:text-slate-400">Usuario</div>
              <div className="mt-1 font-medium text-slate-900 dark:text-slate-50">{deleteUser ? fullName(deleteUser) : ""}</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">@{deleteUser?.username ?? ""}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="truncate max-w-[55ch]">{deleteUser?.email ?? ""}</span>
                {deleteUser?.role ? roleBadge(deleteUser.role) : null}
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button variant="danger" disabled={!canAdmin || deleting || !deleteUser} onClick={confirmDelete}>
              {deleting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-3.5 w-3.5" />
                  Eliminando...
                </span>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
