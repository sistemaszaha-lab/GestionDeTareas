"use client"

import dynamic from "next/dynamic"

const ToastProvider = dynamic(() => import("./ToastProvider"), {
  ssr: false,
  loading: () => null
})

export default function ClientToaster() {
  return <ToastProvider />
}
