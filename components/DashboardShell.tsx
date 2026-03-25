"use client"

import type { SVGProps } from "react"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import type { SessionUser } from "@/lib/session"
import Sidebar, { SidebarContent } from "@/components/Sidebar"
import Topbar from "@/components/Topbar"
import { Button } from "@/components/shadcn/ui/button"

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function DashboardShellInner({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return

    closeButtonRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }

    document.addEventListener("keydown", onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl">
      <Sidebar user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onOpenMenu={() => setMenuOpen(true)} />
        <div className="p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-black/35" onClick={() => setMenuOpen(false)} />

          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto pt-[env(safe-area-inset-top)] overscroll-contain border-r border-slate-200 bg-slate-50 p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-end">
              <Button
                ref={closeButtonRef}
                variant="ghost"
                className="h-10 w-10 px-0"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                <CloseIcon className="h-5 w-5" />
              </Button>
            </div>

            <SidebarContent user={user} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function DashboardShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname()
  return <DashboardShellInner key={pathname} user={user}>{children}</DashboardShellInner>
}