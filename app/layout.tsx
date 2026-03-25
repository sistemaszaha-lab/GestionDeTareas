import "./globals.css"
import type { Metadata, Viewport } from "next"
import ToastProvider from "@/components/ToastProvider"
import PwaRegister from "@/components/PwaRegister"

export const metadata: Metadata = {
  title: "Gestión de tareas",
  description: "Herramienta interna de gestión de tareas",
  applicationName: "Gestión de tareas",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tareas"
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ToastProvider />
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}