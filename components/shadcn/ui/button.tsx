import * as React from "react"
import { cn } from "@/lib/ui"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-white"

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default: "bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99]",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 active:scale-[0.99]",
      outline:
        "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:shadow-sm active:scale-[0.99]",
      ghost: "bg-transparent text-slate-900 hover:bg-slate-100 active:scale-[0.99]"
    }

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      default: "h-11 px-4",
      sm: "h-9 px-3",
      lg: "h-12 px-5"
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
