import { getSessionUser } from "@/lib/session"
import { Card, CardContent } from "@/components/shadcn/ui/card"
import UsersClient from "./UsersClient"

export const runtime = "nodejs"

export default async function UsuariosPage() {
  const user = await getSessionUser()
  if (!user) return null

  if (user.role !== "ADMIN") {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-50">No autorizado</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Solo administradores pueden ver usuarios.</div>
        </CardContent>
      </Card>
    )
  }

  return <UsersClient currentUser={user} />
}