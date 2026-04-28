"use client"

import { useState, useRef, useEffect } from "react"
import { Badge } from "@/components/shadcn/ui/badge"
import { cn } from "@/lib/ui"
import { X, Check, ChevronsUpDown } from "lucide-react"

type Option = {
  id: string
  name: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seleccionar usuarios..."
}: {
  options: Option[]
  selected: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const selectedOptions = options.filter((opt) => selected.includes(opt.id))

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className={cn(
          "flex min-h-[42px] w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-all dark:border-slate-800 dark:bg-slate-950/40",
          open && "ring-2 ring-primary/30 border-primary/50"
        )}
        onClick={() => setOpen(!open)}
      >
        {selectedOptions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((opt) => (
              <Badge key={opt.id} variant="secondary" className="gap-1 pr-1 pl-2 h-6">
                {opt.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleOption(opt.id)
                  }}
                  className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-slate-500">{placeholder}</span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {selected.length > 0 && (
             <X
               className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
               onClick={(e) => {
                 e.stopPropagation()
                 onChange([])
               }}
             />
          )}
          <ChevronsUpDown className="h-4 w-4 text-slate-400" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-950 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = selected.includes(opt.id)
              return (
                <div
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                    isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                  onClick={() => toggleOption(opt.id)}
                >
                  <span>{opt.name}</span>
                  {isSelected && <Check className="h-4 w-4" />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
