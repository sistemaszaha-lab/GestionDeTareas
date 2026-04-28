"use client"

import { useEffect, useMemo, useState } from "react"
import type { TaskPriority, TaskStatus } from "@prisma/client"
import type { CurrentUser, TaskWithRelations, UserLite } from "@/components/tasks/task-types"
import { Button } from "@/components/shadcn/ui/button"
import { Input } from "@/components/shadcn/ui/input"
import { Badge } from "@/components/shadcn/ui/badge"
import { Select as ShadcnSelect } from "@/components/shadcn/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/ui/table"
import { MultiSelect } from "@/components/ui/MultiSelect"

type SortKey = "title" | "status" | "assignedTo" | "dueDate" | "priority"
type SortDir = "asc" | "desc"

function isoDateOnly(d: string | Date | null) {
  if (!d) return ""
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function compareMaybe(a: string | null, b: string | null) {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a.localeCompare(b)
}

export default function TaskTableView({
  tasks,
  users,
  currentUser,
  onUpdate
}: {
  tasks: TaskWithRelations[]
  users: UserLite[]
  currentUser: CurrentUser
  onUpdate: (
    id: string,
    patch: Partial<{
      title: string
      description: string | null
      status: TaskStatus
      priority: TaskPriority
      assignedUserIds: string[]
      dueDate: string | null
      tags: string[]
    }>
  ) => Promise<void>
}) {
  const canAdmin = currentUser.role === "ADMIN"
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("dueDate")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [savingId, setSavingId] = useState<string | null>(null)
  const q = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return tasks
    return tasks.filter((t) => {
      const assignedNames = t.assignedUsers.map(u => u.name).join(" ")
      const hay = `${t.title} ${t.description ?? ""} ${(t.tags ?? []).join(" ")} ${assignedNames}`.toLowerCase()
      return hay.includes(q)
    })
  }, [tasks, q])

  const sorted = useMemo(() => {
    const copy = filtered.slice()

    const priorityRank: Record<TaskPriority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }
    const statusRank: Record<TaskStatus, number> = { PENDING: 1, IN_PROGRESS: 2, DONE: 3 }

    copy.sort((a, b) => {
      let cmp = 0
      if (sortKey === "title") cmp = a.title.localeCompare(b.title)
      if (sortKey === "status") cmp = (statusRank[a.status] ?? 0) - (statusRank[b.status] ?? 0)
      if (sortKey === "priority") cmp = (priorityRank[a.priority] ?? 0) - (priorityRank[b.priority] ?? 0)
      if (sortKey === "assignedTo") cmp = (a.assignedUsers[0]?.name ?? "").localeCompare(b.assignedUsers[0]?.name ?? "")
      if (sortKey === "dueDate") cmp = compareMaybe(isoDateOnly(a.dueDate) || null, isoDateOnly(b.dueDate) || null)
      return sortDir === "asc" ? cmp : -cmp
    })

    return copy
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir("asc")
      return
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"))
  }

  async function save(id: string, patch: Parameters<typeof onUpdate>[1]) {
    if (savingId) return
    setSavingId(id)
    try {
      await onUpdate(id, patch)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">Tabla</div>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar…" className="h-9 w-[min(520px,70vw)]" />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => toggleSort("title")}>
                Título
              </Button>
            </TableHead>
            <TableHead>
              <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => toggleSort("status")}>
                Estado
              </Button>
            </TableHead>
            <TableHead>
              <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => toggleSort("assignedTo")}>
                Usuario
              </Button>
            </TableHead>
            <TableHead>
              <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => toggleSort("dueDate")}>
                Fecha
              </Button>
            </TableHead>
            <TableHead>
              <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => toggleSort("priority")}>
                Prioridad
              </Button>
            </TableHead>
            <TableHead>Tags</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sorted.map((t) => {
            const canEditStatus = canAdmin || t.assignedUsers.some(u => u.id === currentUser.id)
            const canEditFields = canAdmin
            const isSaving = savingId === t.id
            return (
              <TableRow key={t.id}>
                <TableCell className="min-w-[18rem]">
                  <Input
                    defaultValue={t.title}
                    disabled={!canEditFields || isSaving}
                    className="h-9"
                    onBlur={(e) => {
                      const next = e.target.value.trim()
                      if (!canEditFields) return
                      if (next && next !== t.title) void save(t.id, { title: next })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        ;(e.target as HTMLInputElement).blur()
                      }
                    }}
                  />
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  <ShadcnSelect
                    value={t.status}
                    disabled={!canEditStatus || isSaving}
                    onChange={(e) => void save(t.id, { status: e.target.value as TaskStatus })}
                    className="h-9"
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="IN_PROGRESS">En progreso</option>
                    <option value="DONE">Completada</option>
                  </ShadcnSelect>
                </TableCell>

                <TableCell className="min-w-[12rem]">
                  <MultiSelect
                    options={users}
                    selected={t.assignedUsers.map(u => u.id)}
                    onChange={(next) => void save(t.id, { assignedUserIds: next })}
                  />
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  <Input
                    type="date"
                    defaultValue={isoDateOnly(t.dueDate)}
                    disabled={!canEditFields || isSaving}
                    className="h-9 w-[10.5rem]"
                    onBlur={(e) => {
                      if (!canEditFields) return
                      const next = e.target.value ? e.target.value : null
                      const prev = isoDateOnly(t.dueDate) || null
                      if (next !== prev) void save(t.id, { dueDate: next })
                    }}
                  />
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  <ShadcnSelect
                    value={t.priority}
                    disabled={!canEditFields || isSaving}
                    onChange={(e) => void save(t.id, { priority: e.target.value as TaskPriority })}
                    className="h-9"
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                  </ShadcnSelect>
                </TableCell>

                <TableCell className="min-w-[14rem]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(t.tags ?? []).length ? (
                      (t.tags ?? []).slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">—</span>
                    )}
                    {isSaving ? <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">Guardando…</span> : null}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-600 dark:text-slate-400">
                Sin resultados
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  )
}

