import type { SessionUser } from "@/lib/session"

export default function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="w-64 hidden md:flex flex-col border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <div className="text-sm font-semibold">Gestión de tareas</div>
        <div className="text-xs text-fg-muted mt-1">{user.role === "ADMIN" ? "Administrador" : "Empleado"}</div>
      </div>
      <nav className="p-2 text-sm">
        <a className="block rounded-lg px-3 py-2 hover:bg-bg-subtle" href="/dashboard">
          Dashboard
        </a>
      </nav>
      <div className="mt-auto p-4 border-t border-border text-xs text-fg-muted">{user.email}</div>
    </aside>
  )
}

