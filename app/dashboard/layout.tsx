import Sidebar from "@/components/Sidebar"
import Topbar from "@/components/Topbar"
import { getSessionUser } from "@/lib/session"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) return null

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} />
      <div className="flex-1 min-w-0">
        <Topbar user={user} />
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  )
}

