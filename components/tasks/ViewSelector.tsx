"use client"

import { Button } from "@/components/shadcn/ui/button"

export type TasksViewMode = "kanban" | "list" | "table" | "timeline"

const views: Array<{ key: TasksViewMode; label: string }> = [
  { key: "kanban", label: "Resumen rápido" },
  { key: "list", label: "Lista" },
  { key: "table", label: "Tabla" },
  { key: "timeline", label: "Línea del tiempo" }
]

export default function ViewSelector({
  value,
  onChange
}: {
  value: TasksViewMode
  onChange: (value: TasksViewMode) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {views.map((v) => {
        const active = value === v.key
        return (
          <Button
            key={v.key}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            onClick={() => onChange(v.key)}
            aria-pressed={active}
            className="h-9 rounded-full px-4"
          >
            {v.label}
          </Button>
        )
      })}
    </div>
  )
}
