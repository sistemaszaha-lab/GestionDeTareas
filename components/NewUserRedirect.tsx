"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export function NewUserRedirect() {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user?.isNewUser === true) {
      router.push("/complete-profile")
    }
  }, [session, router])

  return null
}
