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

function DialogTrigger({
  asChild,
  children
}: {
  asChild?: boolean
  children: React.ReactElement
}) {
  const { onOpenChange } = useDialogContext()
  if (!asChild) {
    return (
      <button type="button" onClick={() => onOpenChange(true)}>
        {children}
      </button>
    )
  }
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e)
      if (!e.defaultPrevented) onOpenChange(true)
    }
  })
}

function DialogClose({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const { onOpenChange } = useDialogContext()
  if (!asChild) {
    return (
      <button type="button" onClick={() => onOpenChange(false)}>
        {children}
      </button>
    )
  }
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e)
      if (!e.defaultPrevented) onOpenChange(false)
    }
  })
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
            "w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl",
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
  return <h2 className={cn("text-lg font-semibold tracking-[-0.02em] text-slate-900", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-slate-500", className)} {...props} />
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
