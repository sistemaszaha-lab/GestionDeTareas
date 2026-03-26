import * as React from "react"
import { cn } from "@/lib/ui"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full touch-manipulation rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 dark:focus-visible:ring-slate-100/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ring-offset-slate-50 dark:ring-offset-slate-950 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-50 dark:placeholder:text-slate-400 md:min-h-24 md:px-3 md:py-2 md:text-sm",
        className
      )}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }