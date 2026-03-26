import * as React from "react"
import { cn } from "@/lib/ui"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "min-h-12 w-full touch-manipulation rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 dark:focus-visible:ring-slate-100/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ring-offset-slate-50 dark:ring-offset-slate-950 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-50 md:min-h-11 md:px-3 md:text-sm",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
})
Select.displayName = "Select"

export { Select }