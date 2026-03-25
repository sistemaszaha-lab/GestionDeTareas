import type { SessionUser } from "@/lib/session"
import Link from "next/link"

export default function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="w-64 hidden md:flex flex-col border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <div className="text-sm font-semibold">Gestión de tareas</div>
        <div className="text-xs text-fg-muted mt-1">{user.role === "ADMIN" ? "Administrador" : "Empleado"}</div>
      </div>
      <nav className="p-2 flex flex-col gap-1 text-sm font-medium">
        <Link className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-600 transition-all hover:text-slate-900 hover:bg-slate-100" href="/dashboard">
          Dashboard
        </Link>
        <Link className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-600 transition-all hover:text-slate-900 hover:bg-slate-100" href="/dashboard/mis-tareas">
          Mis tareas
        </Link>
      </nav>
      <div className="mt-auto p-4 border-t border-border text-xs text-fg-muted">{user.username}</div>
    </aside>
  )
}