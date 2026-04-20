import type { SessionUser } from "@/lib/session"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"

export function SidebarContent({ user, onNavigate }: { user: SessionUser; onNavigate?: () => void }) {
  return (
    <div className="md:sticky md:top-0">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">Gestión de tareas</CardTitle>
              <CardDescription className="mt-1">Organiza y da seguimiento a tu trabajo.</CardDescription>
            </div>
            <Badge variant={user.role === "ADMIN" ? ("default" as any) : ("secondary" as any)}>
              {user.role === "ADMIN" ? "Admin" : "User"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <nav className="flex flex-col gap-1 text-base md:text-sm">
            <Link
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:bg-slate-900/60 hover:text-slate-900 dark:text-slate-50 md:py-2"
              href="/dashboard"
              onClick={onNavigate}
            >
              Dashboard
            </Link>
            <Link
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:bg-slate-900/60 hover:text-slate-900 dark:text-slate-50 md:py-2"
              href="/dashboard/mis-tareas"
              onClick={onNavigate}
            >
              Mis tareas
            </Link>
            {user.role === "ADMIN" ? (
              <Link
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:bg-slate-900/60 hover:text-slate-900 dark:text-slate-50 md:py-2"
                href="/dashboard/usuarios"
                onClick={onNavigate}
              >
                Usuarios
              </Link>
            ) : null}
          </nav>
        </CardContent>

        <CardFooter className="justify-between">
          <div className="truncate text-xs text-slate-600 dark:text-slate-400">{user.username}</div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="hidden w-72 shrink-0 p-4 md:block">
      <SidebarContent user={user} />
    </aside>
  )
}
