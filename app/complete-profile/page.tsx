import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/auth"
import CompleteProfileClient from "./CompleteProfileClient"

export default async function CompleteProfilePage() {
  const session = await getServerSession(authOptions).catch(() => null)
  const user = session?.user as any

  // NextAuth redirige aquí solo si el usuario es nuevo (pages.newUser)
  if (!user?.email) redirect("/login")

  return <CompleteProfileClient email={user.email as string} defaultName={(user.name as string | undefined) ?? ""} />
}
