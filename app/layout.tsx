import "./globals.css"
import type { Metadata } from "next"
import ToastProvider from "@/components/ToastProvider"

export const metadata: Metadata = {
  title: "Gestión de tareas",
  description: "Herramienta interna de gestión de tareas"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ToastProvider />
        {children}
      </body>
    </html>
  )
}

