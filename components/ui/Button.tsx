"use client"

import type { ButtonHTMLAttributes } from "react"
import Spinner from "@/components/ui/Spinner"
import { cn } from "@/lib/ui"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  variant?: "primary" | "ghost" | "danger"
}

export default function Button({ className, loading, disabled, variant = "primary", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors border border-transparent"
  const variants: Record<string, string> = {
    primary: "bg-primary text-white hover:opacity-90",
    ghost: "bg-transparent border-border text-fg hover:bg-bg-subtle",
    danger: "bg-danger text-white hover:opacity-90"
  }

  return (
    <button
      className={cn(base, variants[variant], (disabled || loading) && "opacity-60 cursor-not-allowed", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Spinner />
          Cargando
        </span>
      ) : (
        props.children
      )}
    </button>
  )
}

