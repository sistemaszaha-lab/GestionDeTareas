"use client"

import type { SVGProps } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { signOut } from "next-auth/react"
import type { SessionUser } from "@/lib/session"
import { Button } from "@/components/shadcn/ui/button"
import { Badge } from "@/components/shadcn/ui/badge"
import { Card } from "@/components/shadcn/ui/card"

function HamburgerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Topbar({ user, onOpenMenu }: { user: SessionUser; onOpenMenu?: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function logout() {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" })
      if (!res.ok) throw new Error("No se pudo cerrar sesión")
      await signOut({ redirect: false })
      router.replace("/login")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <header className="sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
      <Card className="rounded-none border-0 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {onOpenMenu ? (
              <Button
                variant="ghost"
                className="h-10 w-10 px-0 md:hidden"
                onClick={onOpenMenu}
                aria-label="Abrir menú"
              >
                <HamburgerIcon className="h-5 w-5" />
              </Button>
            ) : null}
            <div className="truncate text-sm font-semibold tracking-[-0.01em] md:hidden">Tareas</div>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
              {user.role === "ADMIN" ? "Administrador" : "Empleado"}
            </Badge>
            <div className="hidden min-w-0 text-sm text-slate-700 md:block">
              <span className="text-slate-500">Hola,</span>{" "}
              <span className="inline-block max-w-[18ch] truncate align-bottom font-medium">{user.name}</span>
            </div>
            <Button variant="outline" onClick={logout} disabled={loading} className="h-10 px-3">
              {loading ? "Saliendo…" : "Salir"}
            </Button>
          </div>
        </div>
      </Card>
    </header>
  )
}