"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { signOut } from "next-auth/react"
import type { SessionUser } from "@/lib/session"
import Button from "@/components/ui/Button"

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
    <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur">
      <div className="h-14 px-4 md:px-6 flex items-center justify-between gap-3">
        <div className="md:hidden text-sm font-semibold">Tareas</div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-sm">
            <span className="text-fg-muted">Hola,</span> <span className="font-medium">{user.name}</span>
          </div>
          <Button variant="ghost" onClick={logout} loading={loading}>
            Salir
          </Button>
        </div>
      </div>
    </header>
  )
}
