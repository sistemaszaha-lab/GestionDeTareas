"use client"

import { useMemo } from "react"
import type { TaskWithRelations } from "@/components/tasks/task-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"

function startOfDay(d: Date) {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10)
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function TaskTimelineView({ tasks }: { tasks: TaskWithRelations[] }) {
  const prepared = useMemo(() => {
    const items = tasks
      .map((t) => {
        const created = new Date(t.createdAt)
        const due = t.dueDate ? new Date(t.dueDate as any) : null
        if (Number.isNaN(created.getTime())) return null
        const start = startOfDay(created)
        const end = due && !Number.isNaN(due.getTime()) ? startOfDay(due) : start
        return { task: t, start, end }
      })
      .filter(Boolean) as Array<{ task: TaskWithRelations; start: Date; end: Date }>

    if (!items.length) return { items: [], start: new Date(), days: 14 }

    const minStart = items.reduce((acc, it) => (it.start < acc ? it.start : acc), items[0].start)
    const maxEnd = items.reduce((acc, it) => (it.end > acc ? it.end : acc), items[0].end)

    const start = startOfDay(minStart)
    const end = startOfDay(maxEnd)
    const days = clamp(Math.round((end.getTime() - start.getTime()) / 86400000) + 1, 14, 120)

    return { items, start, days }
  }, [tasks])

  const dayLabels = useMemo(() => {
    return Array.from({ length: prepared.days }).map((_, i) => {
      const d = new Date(prepared.start)
      d.setDate(d.getDate() + i)
      return { key: isoDateOnly(d), day: d.getDate(), iso: isoDateOnly(d) }
    })
  }, [prepared.days, prepared.start])

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Línea del tiempo</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto overscroll-x-contain">
          <div className="min-w-max">
            <div
              className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60"
              style={{ gridTemplateColumns: `18rem repeat(${prepared.days}, 3rem)` }}
            >
              <div className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Tarea</div>
              {dayLabels.map((d) => (
                <div key={d.key} className="px-1 py-2 text-center text-[11px] text-slate-600 dark:text-slate-400">
                  {d.day}
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {prepared.items.map(({ task, start, end }) => {
                const startIndex = Math.max(0, Math.round((start.getTime() - prepared.start.getTime()) / 86400000))
                const endIndex = Math.max(0, Math.round((end.getTime() - prepared.start.getTime()) / 86400000))

                const barColor =
                  task.status === "DONE"
                    ? "bg-emerald-500/80"
                    : task.status === "IN_PROGRESS"
                      ? "bg-sky-500/80"
                      : "bg-slate-500/50"

                return (
                  <div
                    key={task.id}
                    className="grid items-center"
                    style={{ gridTemplateColumns: `18rem repeat(${prepared.days}, 3rem)` }}
                  >
                    <div className="min-w-0 px-3 py-2">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{task.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{task.assignedTo?.name ?? "—"}</Badge>
                        {task.dueDate ? <Badge variant="secondary">Vence {new Date(task.dueDate as any).toISOString().slice(0, 10)}</Badge> : null}
                      </div>
                    </div>

                    <div
                      className="px-2 py-2"
                      style={{ gridColumn: `2 / span ${prepared.days}` }}
                    >
                      <div className="grid h-12 items-center" style={{ gridTemplateColumns: `repeat(${prepared.days}, 3rem)` }}>
                        <div
                          className={[
                            "h-6 rounded-full px-2 flex items-center",
                            "text-[11px] font-semibold text-white shadow-sm",
                            barColor
                          ].join(" ")}
                          style={{
                            gridColumnStart: Math.min(prepared.days, startIndex + 1),
                            gridColumnEnd: Math.min(prepared.days + 1, Math.max(endIndex, startIndex) + 2)
                          }}
                          title={`${isoDateOnly(start)} → ${isoDateOnly(end)}`}
                        >
                          <span className="truncate">{task.status === "DONE" ? "Done" : task.status === "IN_PROGRESS" ? "En progreso" : "Pendiente"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {prepared.items.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-600 dark:text-slate-400">Sin tareas</div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
