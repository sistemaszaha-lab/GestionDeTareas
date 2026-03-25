import DashboardShell from "@/components/DashboardShell"
import { getSessionUser } from "@/lib/session"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <DashboardShell user={user}>{children}</DashboardShell>
    </div>
  )
}