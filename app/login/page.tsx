import { Suspense } from "react"
import LoginClient from "./LoginClient"

function LoginFallback() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-white to-slate-50">
      <div className="w-full max-w-md rounded-lg border bg-white p-5 sm:p-6 shadow-sm">
        <div className="h-5 w-32 rounded bg-slate-100" />
        <div className="mt-2 h-4 w-56 rounded bg-slate-100" />
        <div className="mt-6 space-y-3">
          <div className="h-10 w-full rounded bg-slate-100" />
          <div className="h-10 w-full rounded bg-slate-100" />
          <div className="h-10 w-full rounded bg-slate-100" />
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  )
}