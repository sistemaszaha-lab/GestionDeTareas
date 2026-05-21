"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import type { SessionUser } from "@/lib/session"
import { fetchJsonOrThrow } from "@/lib/fetch-json"
import { Button } from "@/components/shadcn/ui/button"
import { Card } from "@/components/shadcn/ui/card"
import { Search, Bell, Sun, Moon, LogOut, Menu } from "lucide-react"

export default function Topbar({ user, onOpenMenu }: { user: SessionUser; onOpenMenu?: () => void }) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function logout() {
    setLoading(true)
    try {
      await fetchJsonOrThrow<{ ok: true }>("/api/auth/logout", { method: "POST" }, { defaultError: "No se pudo cerrar sesión", logTag: "POST /api/auth/logout" })
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
    <header className="sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
      <Card className="rounded-none border-0 border-b border-slate-200/60 bg-white/80 backdrop-blur-md dark:border-slate-800/60 dark:bg-[#1C1D1D]/80">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-2">
            {onOpenMenu ? (
              <Button
                variant="ghost"
                className="h-10 w-10 px-0 text-slate-700 hover:bg-[#016B6B]/5 md:hidden dark:text-slate-200"
                onClick={onOpenMenu}
                aria-label="Abrir menú"
              >
                <Menu className="h-5.5 w-5.5" />
              </Button>
            ) : null}
            <div className="truncate font-poppins text-base font-black tracking-tight text-[#464747] dark:text-[#F8FAFA] md:hidden">
              ZAHA LAB
            </div>
          </div>

          <div className="hidden max-w-md flex-1 md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar tareas..."
                className="h-9.5 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-normal text-[#464747] placeholder-slate-400 transition-all focus:border-[#016B6B] focus:bg-white focus:ring-2 focus:ring-[#016B6B]/15 dark:border-slate-800 dark:bg-[#121313] dark:text-slate-100 dark:focus:border-[#3F9EA2] dark:focus:bg-[#121313] dark:focus:ring-[#3F9EA2]/15"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" className="h-10 w-10 px-0 text-slate-600 hover:bg-[#016B6B]/5 md:hidden dark:text-slate-300">
              <Search className="h-5 w-5" />
            </Button>

            <div className="relative" ref={notificationRef}>
              <Button
                variant="ghost"
                className="h-10 w-10 px-0 relative text-slate-600 hover:bg-[#016B6B]/5 dark:text-slate-300"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notificaciones"
              >
                <Bell className="h-5 w-5" />
              </Button>

              {showNotifications ? (
                <div className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl dark:border-slate-850 dark:bg-[#1C1D1D]">
                  <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800/80">
                    <span className="text-xs font-bold font-poppins text-slate-700 dark:text-slate-300">Notificaciones</span>
                  </div>
                  <div className="p-4 text-center">
                    <p className="font-poppins text-xs text-slate-500 dark:text-slate-400">No hay notificaciones nuevas</p>
                  </div>
                </div>
              ) : null}
            </div>

            {mounted ? (
              <Button
                variant="ghost"
                className="h-10 w-10 px-0 text-slate-600 hover:bg-[#016B6B]/5 dark:text-slate-300"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            ) : (
              <div className="h-10 w-10" />
            )}

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="hidden min-w-0 text-right md:block">
              <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Bienvenido</div>
              <div className="max-w-[15ch] truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                {user.name}
              </div>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#016B6B] text-xs font-bold uppercase text-white ring-2 ring-white shadow-sm dark:ring-slate-900 md:hidden">
              {user.name.slice(0, 2)}
            </div>

            <Button
              variant="outline"
              onClick={logout}
              disabled={loading}
              className="flex h-9 items-center gap-1.5 rounded-xl border-slate-200 px-3 text-xs font-normal text-slate-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:text-slate-300 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/20 dark:hover:text-rose-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{loading ? "Saliendo..." : "Salir"}</span>
            </Button>
          </div>
        </div>
      </Card>
    </header>
  )
}
