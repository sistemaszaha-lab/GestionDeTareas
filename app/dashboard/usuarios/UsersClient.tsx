"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import type { UserRole } from "@prisma/client"
import { Button } from "@/components/shadcn/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/ui/table"
import { fetchJsonOrThrow } from "@/lib/fetch-json"
import CreateUserDialog from "@/components/CreateUserDialog"

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

function roleBadge(role: UserRole) {
  return (
    <Badge variant={role === "ADMIN" ? ("default" as any) : ("secondary" as any)}>
      {role === "ADMIN" ? "Admin" : "User"}
    </Badge>
  )
}

function fullName(u: Pick<UserRow, "firstName" | "middleName" | "lastName" | "name">) {
  const candidate = [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ").trim()
  return candidate || u.name
}

export default function UsersClient({ currentUser }: { currentUser: CurrentUser }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900 dark:text-slate-50">Usuarios</h1>
          <div className="text-sm text-slate-600 dark:text-slate-400">Administra los usuarios del sistema.</div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            {loading ? "Cargando..." : "Refrescar"}
          </Button>
          <Button onClick={() => setCreateOpen(true)} disabled={currentUser.role !== "ADMIN"}>
            Nuevo usuario
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="text-sm text-slate-600 dark:text-slate-400">Cargando usuarios...</div>
          </CardContent>
        </Card>
      ) : null}

      {!loading && sorted.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-50">No hay usuarios</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Crea el primer usuario para empezar.</div>
            <div className="mt-4">
              <Button onClick={() => setCreateOpen(true)}>Crear usuario</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!loading && sorted.length > 0 ? (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-slate-50">{fullName(u)}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{u.name}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{u.username}</TableCell>
                    <TableCell className="truncate max-w-[26ch]">{u.email}</TableCell>
                    <TableCell>{u.phone}</TableCell>
                    <TableCell>{roleBadge(u.role)}</TableCell>
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
                      <CardTitle className="text-base truncate">{fullName(u)}</CardTitle>
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
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} currentUser={currentUser} onCreated={refresh} />
    </div>
  )
}