import type { SessionUser } from "@/lib/session"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"

export default function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="hidden md:block w-72 shrink-0 p-4">
      <div className="sticky top-4">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base">Gestión de tareas</CardTitle>
                <CardDescription className="mt-1">Organiza y da seguimiento a tu trabajo.</CardDescription>
              </div>
              <Badge variant={user.role === "ADMIN" ? ("default" as any) : ("secondary" as any)}>
                {user.role === "ADMIN" ? "Admin" : "Empleado"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <nav className="flex flex-col gap-1 text-sm">
              <Link
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                href="/dashboard"
              >
                Dashboard
              </Link>
              <Link
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                href="/dashboard/mis-tareas"
              >
                Mis tareas
              </Link>
            </nav>
          </CardContent>

          <CardFooter className="justify-between">
            <div className="text-xs text-slate-500 truncate">{user.username}</div>
          </CardFooter>
        </Card>
      </div>
    </aside>
  )
}
