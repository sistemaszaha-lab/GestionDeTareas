"use client"

import type { SVGProps } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { signOut } from "next-auth/react"
import { useTheme } from "next-themes"
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

function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M5 19l1.5-1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Topbar({ user, onOpenMenu }: { user: SessionUser; onOpenMenu?: () => void }) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => setMounted(true), [])

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

  const isDark = resolvedTheme === "dark"

  return (
    <header className="sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
      <Card className="rounded-none border-0 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 backdrop-blur">
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {onOpenMenu ? (
              <Button variant="ghost" className="h-10 w-10 px-0 md:hidden" onClick={onOpenMenu} aria-label="Abrir menú">
                <HamburgerIcon className="h-5 w-5" />
              </Button>
            ) : null}
            <div className="truncate text-sm font-semibold tracking-[-0.01em] md:hidden">Tareas</div>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
              {user.role === "ADMIN" ? "Administrador" : "Empleado"}
            </Badge>

            <div className="hidden min-w-0 text-sm text-slate-900 dark:text-slate-50 md:block">
              <span className="text-slate-600 dark:text-slate-400">Hola,</span>{" "}
              <span className="inline-block max-w-[18ch] truncate align-bottom font-medium">{user.name}</span>
            </div>

            {mounted ? (
              <Button
                variant="ghost"
                className="h-10 w-10 px-0"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </Button>
            ) : (
              <div className="h-10 w-10" />
            )}

            <Button variant="outline" onClick={logout} disabled={loading} className="h-10 px-3">
              {loading ? "Saliendo…" : "Salir"}
            </Button>
          </div>
        </div>
      </Card>
    </header>
  )
}