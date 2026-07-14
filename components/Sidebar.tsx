"use client"

import { useMemo } from "react"
import type { SessionUser } from "@/lib/session"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard,
 CheckSquare,
 Calendar,
 BarChart2,
 Users,
 Trash2
} from "lucide-react"
import { cn } from "@/lib/ui"
import { Badge } from "@/components/shadcn/ui/badge"

type NavigationRole = SessionUser["role"]

const navigationItems: ReadonlyArray<{
  label: string
  href: string
  icon: typeof LayoutDashboard
  exact: boolean
  roles: readonly NavigationRole[]
}> = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true, roles: ["ADMIN", "USER"] },
  { label: "Mis tareas", href: "/dashboard/mis-tareas", icon: CheckSquare, exact: false, roles: ["ADMIN", "USER"] },
  { label: "Calendario", href: "/dashboard/calendario", icon: Calendar, exact: false, roles: ["ADMIN", "USER"] },
  { label: "Reportes", href: "/dashboard/reportes", icon: BarChart2, exact: false, roles: ["ADMIN", "USER"] },
  { label: "Usuarios", href: "/dashboard/usuarios", icon: Users, exact: false, roles: ["ADMIN"] }
]

export function SidebarContent({
  user,
  onNavigate,
  onOpenTrash
}: {
  user: SessionUser
  onNavigate?: () => void
  onOpenTrash?: () => void
}) {
  const pathname = usePathname()

  const isLinkActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))
  const isTrashActive = pathname === "/dashboard/papelera"

  const visibleItems = useMemo(
    () => navigationItems.filter((item) => item.roles.includes(user.role)),
    [user.role]
  )

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#016B6B] text-white shadow-md shadow-[#016B6B]/20">
            <span className="text-xs font-black">Z</span>
          </div>
          <div>
            <div className="font-poppins text-lg font-black leading-none tracking-tight text-[#464747] dark:text-[#F8FAFA]">
              ZAHA LAB
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#3F9EA2]">
              Gestión de tareas
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-1">
          {visibleItems.map((link) => {
            const Icon = link.icon
            const active = isLinkActive(link.href, link.exact)

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                  active
                    ? "bg-[#016B6B] text-white shadow-md shadow-[#016B6B]/15"
                    : "text-[#464747]/80 hover:bg-[#016B6B]/5 hover:text-[#016B6B] dark:text-[#F8FAFA]/80 dark:hover:bg-[#3F9EA2]/5 dark:hover:text-[#3F9EA2]"
                )}
              >
                <Icon
                  className={cn(
                    "h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110",
                    active ? "text-white" : "text-[#464747]/60 dark:text-[#F8FAFA]/50 group-hover:text-[#016B6B] dark:group-hover:text-[#3F9EA2]"
                  )}
                />
                <span className="font-poppins font-normal">{link.label}</span>
                {active ? <span className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white" /> : null}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto px-1 pt-4">
        <button
          type="button"
          onClick={onOpenTrash}
          className={cn(
            "mb-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
            isTrashActive
              ? "bg-rose-50 text-rose-600 shadow-sm dark:bg-rose-950/20 dark:text-rose-300"
              : "text-[#464747]/80 hover:bg-rose-50 hover:text-rose-600 dark:text-[#F8FAFA]/80 dark:hover:bg-rose-950/20 dark:hover:text-rose-300"
          )}
        >
          <Trash2
            className={cn(
              "h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110",
              isTrashActive ? "text-rose-600 dark:text-rose-300" : "text-[#464747]/60 dark:text-[#F8FAFA]/50 group-hover:text-rose-600 dark:group-hover:text-rose-300"
            )}
          />
          <span className="font-poppins font-normal">Papelera</span>
        </button>

        <div className="rounded-xl border border-slate-200/50 bg-slate-100/50 p-3.5 dark:border-slate-800/40 dark:bg-slate-900/40">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3F9EA2] text-xs font-bold uppercase text-white ring-2 ring-white dark:ring-slate-950">
              {user.name.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold leading-snug text-slate-800 dark:text-slate-200">
                {user.name}
              </div>
              <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                @{user.username}
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {user.role}
            </span>
            <Badge className="border-0 bg-[#016B6B]/10 px-2 py-0.5 text-[10px] font-bold text-[#016B6B] hover:bg-[#016B6B]/15 dark:bg-[#3F9EA2]/10 dark:text-[#3F9EA2] dark:hover:bg-[#3F9EA2]/15">
              Conectado
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-[#1C1D1D] md:block sticky top-0">
      <SidebarContent user={user} />
    </aside>
  )
}
