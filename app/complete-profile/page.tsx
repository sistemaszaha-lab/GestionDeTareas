import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/auth"
import CompleteProfileClient from "./CompleteProfileClient"

export default async function CompleteProfilePage() {
  const session = await getServerSession(authOptions).catch(() => null)
  const user = session?.user as any

  if (!user?.email) redirect("/login")
  if (!(session as any)?.isNewUser) redirect("/dashboard")

  return <CompleteProfileClient email={user.email as string} defaultName={(user.name as string | undefined) ?? ""} />
}
