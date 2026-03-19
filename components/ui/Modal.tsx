"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/ui"

type Props = {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export default function Modal({ open, title, onClose, children, className }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Cerrar" />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className={cn("w-full max-w-2xl rounded-xl bg-card shadow-soft border border-border", className)}>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              {title ? <h2 className="text-base font-semibold truncate">{title}</h2> : null}
            </div>
            <button
              className="text-sm text-fg-muted hover:text-fg rounded-md px-2 py-1"
              type="button"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  )
}

