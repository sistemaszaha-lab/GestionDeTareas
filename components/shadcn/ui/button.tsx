import * as React from "react"
import { cn } from "@/lib/ui"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "primary" | "danger"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type, ...props }, ref) => {
    const base =
      "inline-flex select-none touch-manipulation items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-white"

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default: "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-900 active:scale-[0.98]",
      primary: "bg-primary text-white hover:opacity-90 active:opacity-95 active:scale-[0.98]",
      danger: "bg-danger text-white hover:opacity-90 active:opacity-95 active:scale-[0.98]",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-200 active:scale-[0.98]",
      outline:
        "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:shadow-sm active:bg-slate-100 active:scale-[0.98]",
      ghost: "bg-transparent text-slate-900 hover:bg-slate-100 active:bg-slate-100 active:scale-[0.98]"
    }

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      default: "min-h-12 px-4 text-base md:min-h-11 md:text-sm",
      sm: "min-h-11 px-3 text-sm md:min-h-9",
      lg: "min-h-12 px-5 text-base md:text-sm"
    }

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }