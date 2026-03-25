"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { signOut } from "next-auth/react"
import type { SessionUser } from "@/lib/session"
import { Button } from "@/components/shadcn/ui/button"
import { Badge } from "@/components/shadcn/ui/badge"
import { Card } from "@/components/shadcn/ui/card"

export default function Topbar({ user }: { user: SessionUser }) {
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
    <header className="sticky top-0 z-10">
      <Card className="rounded-none border-0 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="h-14 px-4 md:px-6 flex items-center justify-between gap-3">
          <div className="md:hidden text-sm font-semibold tracking-[-0.01em]">Tareas</div>

          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:inline-flex">
              {user.role === "ADMIN" ? "Administrador" : "Empleado"}
            </Badge>
            <div className="text-sm text-slate-700">
              <span className="text-slate-500">Hola,</span> <span className="font-medium">{user.name}</span>
            </div>
            <Button variant="outline" onClick={logout} disabled={loading}>
              {loading ? "Saliendo…" : "Salir"}
            </Button>
          </div>
        </div>
      </Card>
    </header>
  )
}
