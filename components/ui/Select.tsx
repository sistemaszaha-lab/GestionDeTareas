"use client"

import type { SelectHTMLAttributes } from "react"
import { cn } from "@/lib/ui"

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
}

export default function Select({ className, label, children, ...props }: Props) {
  return (
    <label className="block">
      {label ? <span className="text-sm font-medium">{label}</span> : null}
      <select
        className={cn(
          "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

