"use client"

import * as React from "react"

type ThemeMode = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

type ThemeContextValue = {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
}

const STORAGE_KEY = "zaha-theme"
const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function subscribeTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {}

  const media = window.matchMedia("(prefers-color-scheme: dark)")
  const onChange = () => callback()

  media.addEventListener("change", onChange)
  window.addEventListener("storage", onChange)

  return () => {
    media.removeEventListener("change", onChange)
    window.removeEventListener("storage", onChange)
  }
}

function getClientTheme(): ThemeMode {
  if (typeof window === "undefined") return "system"
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system"
}

function getServerTheme(): ThemeMode {
  return "system"
}

function getClientResolvedTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getServerResolvedTheme(): ResolvedTheme {
  return "light"
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(subscribeTheme, getClientTheme, getServerTheme)
  const systemTheme = React.useSyncExternalStore(subscribeTheme, getClientResolvedTheme, getServerResolvedTheme)
  const resolvedTheme = theme === "system" ? systemTheme : theme

  const setTheme = React.useCallback((nextTheme: ThemeMode) => {
    if (typeof window === "undefined") return

    if (nextTheme === "system") {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
    }

    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }))
  }, [])

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolvedTheme === "dark")
  }, [resolvedTheme])

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme
    }),
    [resolvedTheme, setTheme, theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
