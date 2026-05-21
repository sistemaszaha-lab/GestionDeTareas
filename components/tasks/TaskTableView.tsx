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
import { Search, ArrowUpDown, AlertCircle } from "lucide-react"
import { cn } from "@/lib/ui"

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
      const hay = `${t.title} ${t.description ?? ""} ${assignedNames}`.toLowerCase()
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

  // Priority Styles mapping
  const priorityStyles = {
    HIGH: "bg-rose-50 text-[#EF4444] border-rose-100 dark:bg-rose-950/20 dark:text-rose-450",
    MEDIUM: "bg-amber-50 text-[#F59E0B] border-amber-100 dark:bg-amber-950/20 dark:text-amber-450",
    LOW: "bg-[#3F9EA2]/10 text-[#3F9EA2] border-[#3F9EA2]/20 dark:bg-[#3F9EA2]/5"
  }

  const priorityLabel = {
    HIGH: "Alta",
    MEDIUM: "Media",
    LOW: "Baja"
  }

  // Status Styles mapping
  const statusStyles = {
    PENDING: "bg-[#3F9EA2]/10 text-[#3F9EA2] dark:bg-[#3F9EA2]/5",
    IN_PROGRESS: "bg-[#016B6B]/10 text-[#016B6B] dark:bg-[#3F9EA2]/5 dark:text-[#3F9EA2]",
    DONE: "bg-[#22C55E]/10 text-[#22C55E] dark:bg-[#22C55E]/5"
  }

  const statusLabel = {
    PENDING: "Pendiente",
    IN_PROGRESS: "En progreso",
    DONE: "Completada"
  }

  return (
    <div className="space-y-4">
      
      {/* Title & search row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-poppins font-black text-[#464747] dark:text-[#F8FAFA] uppercase tracking-wider">
          Vista de Tabla
        </div>
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Filtrar por título, tags o responsable..." 
            className="h-9.5 pl-10 rounded-xl" 
          />
        </div>
      </div>

      {/* Styled Table wrapper */}
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#1C1D1D] shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-slate-200/60 dark:border-slate-855/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-2.5">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="h-8 px-2 font-bold text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" 
                  onClick={() => toggleSort("title")}
                >
                  <span>Título</span>
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="py-2.5">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="h-8 px-2 font-bold text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" 
                  onClick={() => toggleSort("status")}
                >
                  <span>Estado</span>
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="py-2.5">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="h-8 px-2 font-bold text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" 
                  onClick={() => toggleSort("assignedTo")}
                >
                  <span>Responsable</span>
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="py-2.5">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="h-8 px-2 font-bold text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" 
                  onClick={() => toggleSort("dueDate")}
                >
                  <span>Fecha</span>
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="py-2.5">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="h-8 px-2 font-bold text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" 
                  onClick={() => toggleSort("priority")}
                >
                  <span>Prioridad</span>
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="py-2.5 font-bold text-xs text-slate-400 px-4">Tags</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {sorted.map((t) => {
              const canEditStatus = canAdmin || t.assignedUsers.some(u => u.id === currentUser.id)
              const canEditFields = canAdmin
              const isSaving = savingId === t.id
              return (
                <TableRow key={t.id} className="hover:bg-slate-50/20 dark:hover:bg-[#121313]/5">
                  <TableCell className="min-w-[18rem] py-3">
                    <Input
                      defaultValue={t.title}
                      disabled={!canEditFields || isSaving}
                      className="h-8.5 text-xs rounded-xl shadow-none focus-visible:bg-white"
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

                  <TableCell className="whitespace-nowrap py-3">
                    <ShadcnSelect
                      value={t.status}
                      disabled={!canEditStatus || isSaving}
                      onChange={(e) => void save(t.id, { status: e.target.value as TaskStatus })}
                      className="h-8.5 text-xs rounded-xl"
                    >
                      <option value="PENDING">Pendiente</option>
                      <option value="IN_PROGRESS">En progreso</option>
                      <option value="DONE">Completada</option>
                    </ShadcnSelect>
                  </TableCell>

                  <TableCell className="min-w-[12rem] py-3">
                    <MultiSelect
                      options={users}
                      selected={t.assignedUsers.map(u => u.id)}
                      onChange={(next) => void save(t.id, { assignedUserIds: next })}
                    />
                  </TableCell>

                  <TableCell className="whitespace-nowrap py-3">
                    <Input
                      type="date"
                      defaultValue={isoDateOnly(t.dueDate)}
                      disabled={!canEditFields || isSaving}
                      className="h-8.5 w-[10.5rem] text-xs rounded-xl shadow-none focus-visible:bg-white"
                      onBlur={(e) => {
                        if (!canEditFields) return
                        const next = e.target.value ? e.target.value : null
                        const prev = isoDateOnly(t.dueDate) || null
                        if (next !== prev) void save(t.id, { dueDate: next })
                      }}
                    />
                  </TableCell>

                  <TableCell className="whitespace-nowrap py-3">
                    <ShadcnSelect
                      value={t.priority}
                      disabled={!canEditFields || isSaving}
                      onChange={(e) => void save(t.id, { priority: e.target.value as TaskPriority })}
                      className="h-8.5 text-xs rounded-xl"
                    >
                      <option value="LOW">Baja</option>
                      <option value="MEDIUM">Media</option>
                      <option value="HIGH">Alta</option>
                    </ShadcnSelect>
                  </TableCell>

                  <TableCell className="min-w-[14rem] py-3 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isSaving ? (
                        <span className="ml-1 text-[9px] font-bold text-[#016B6B] animate-pulse flex items-center gap-0.5">
                          <AlertCircle className="h-3 w-3" /> Guardando
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                  Sin registros que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
