"use client"

import { useEffect, useRef, useState } from "react"
import RecycleBinClient from "@/app/dashboard/papelera/RecycleBinClient"
import { fetchJsonOrThrow } from "@/lib/fetch-json"
import { Button } from "@/components/shadcn/ui/button"
import { RefreshCw, Trash2, X } from "lucide-react"

type TrashTask = {
  id: string
  title: string
  description: string | null
  status: "PENDING" | "IN_PROGRESS" | "DONE"
  priority: "LOW" | "MEDIUM" | "HIGH"
  dueDate: string | Date | null
  createdAt: string | Date
  deletedAt: string | Date | null
  deletedBy: { id: string; name: string; username: string } | null
  assignedUsers: Array<{ id: string; name: string; username: string }>
  attachments?: Array<{ id: string; name: string; url: string; type: "file" | "link"; fileType?: string; createdAt?: string }> | null
  tags?: string[] | null
  comments?: Array<{ id: string }>
}

type TrashResponse = {
  tasks?: TrashTask[]
}

export default function TrashPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const [tasks, setTasks] = useState<TrashTask[]>([])
  const [nowIso, setNowIso] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [version, setVersion] = useState(0)

  async function loadTrash() {
    setLoading(true)
    setError("")

    try {
      const data = await fetchJsonOrThrow<TrashResponse>(
        "/api/tasks/trash",
        { cache: "no-store" },
        { defaultError: "No se pudo cargar la papelera", logTag: "GET /api/tasks/trash" }
      )
      setTasks(data.tasks ?? [])
      setNowIso(new Date().toISOString())
      setVersion((current) => current + 1)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return

    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKeyDown)

    const loadTimer = window.setTimeout(() => {
      void loadTrash()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col overflow-hidden border-l border-slate-200/60 bg-[#F8FAFA] shadow-2xl dark:border-slate-800/60 dark:bg-[#121313]">
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800/60 dark:bg-[#1C1D1D]/90 md:px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-300">
              <Trash2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-sm font-poppins font-black tracking-tight text-slate-900 dark:text-slate-50">Papelera</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Tareas eliminadas dentro de la interfaz actual</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void loadTrash()} disabled={loading} className="rounded-xl">
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
            <Button ref={closeButtonRef} type="button" variant="ghost" onClick={onClose} className="h-10 w-10 rounded-xl px-0" aria-label="Cerrar papelera">
              <X className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
          {loading && version === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              Cargando papelera...
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">
              <div className="font-semibold">No se pudo abrir la papelera</div>
              <div className="mt-1">{error}</div>
              <Button type="button" onClick={() => void loadTrash()} className="mt-3 rounded-xl bg-rose-600 text-white hover:bg-rose-700">
                Reintentar
              </Button>
            </div>
          ) : null}

          {!error && version > 0 ? (
            <RecycleBinClient key={`trash-panel-${version}`} initialTasks={tasks} nowIso={nowIso} embedded />
          ) : null}
        </div>
      </aside>
    </div>
  )
}
