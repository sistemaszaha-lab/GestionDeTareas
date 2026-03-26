"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/ui"

type DialogContextValue = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("Dialog components must be used within <Dialog />")
  return ctx
}

function Dialog({
  open,
  onOpenChange,
  children
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
}

type AsChildElement = React.ReactElement<{ onClick?: React.MouseEventHandler<any> }>

function DialogTrigger({
  asChild,
  children
}: {
  asChild?: boolean
  children: AsChildElement
}) {
  const { onOpenChange } = useDialogContext()
  if (!asChild) {
    return (
      <button type="button" onClick={() => onOpenChange(true)}>
        {children}
      </button>
    )
  }

  const child = children as AsChildElement
  return React.cloneElement(child, {
    onClick: (e: React.MouseEvent) => {
      child.props.onClick?.(e)
      if (!e.defaultPrevented) onOpenChange(true)
    }
  } as any)
}

function DialogClose({ asChild, children }: { asChild?: boolean; children: AsChildElement }) {
  const { onOpenChange } = useDialogContext()
  if (!asChild) {
    return (
      <button type="button" onClick={() => onOpenChange(false)}>
        {children}
      </button>
    )
  }

  const child = children as AsChildElement
  return React.cloneElement(child, {
    onClick: (e: React.MouseEvent) => {
      child.props.onClick?.(e)
      if (!e.defaultPrevented) onOpenChange(false)
    }
  } as any)
}

function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, onOpenChange } = useDialogContext()

  React.useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
        aria-label="Cerrar"
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "w-full max-w-lg rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl",
            "dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-50",
            "animate-in fade-in-0 zoom-in-95",
            className
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-end gap-2 p-6 pt-0", className)} {...props} />
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-semibold tracking-[-0.02em] text-slate-900 dark:text-slate-50", className)} {...props} />
  )
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-slate-500 dark:text-slate-400", className)} {...props} />
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
}