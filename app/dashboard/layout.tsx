import DashboardShell from "@/components/DashboardShell"
import { getSessionUser } from "@/lib/session"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) return null

  return (
    <div className="min-h-screen bg-[#F8FAFA] dark:bg-[#121313] text-[#464747] dark:text-[#F8FAFA]">
      <DashboardShell user={user}>{children}</DashboardShell>
    </div>
  )
}