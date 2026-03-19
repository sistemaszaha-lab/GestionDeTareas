"use client"

import type { InputHTMLAttributes } from "react"
import { cn } from "@/lib/ui"

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export default function Input({ className, label, id, ...props }: Props) {
  const inputId = id ?? props.name ?? undefined
  return (
    <label className="block">
      {label ? <span className="text-sm font-medium">{label}</span> : null}
      <input
        id={inputId}
        className={cn(
          "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30",
          className
        )}
        {...props}
      />
    </label>
  )
}

