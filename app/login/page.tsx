import { Suspense } from "react"
import LoginClient from "./LoginClient"

function LoginFallback() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-5 sm:p-6 shadow-sm">
        <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-6 space-y-3">
          <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-800" />
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
