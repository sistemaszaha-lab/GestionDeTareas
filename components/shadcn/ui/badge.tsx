import * as React from "react"
import { cn } from "@/lib/ui"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "danger"
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant = "default", ...props }, ref) => {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight transition-colors"

  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "border-transparent bg-slate-900 text-white",
    secondary: "border-transparent bg-slate-100 text-slate-900",
    outline: "border-slate-200 bg-white text-slate-900",
    success: "border-transparent bg-emerald-600 text-white",
    danger: "border-transparent bg-rose-600 text-white"
  }

  return <span ref={ref} className={cn(base, variants[variant], className)} {...props} />
})
Badge.displayName = "Badge"

export { Badge }
