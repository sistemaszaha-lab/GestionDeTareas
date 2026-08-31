export const NOTE_COLORS = [
  { id: "rose", bg: "bg-rose-100 dark:bg-rose-950/40", border: "border-rose-200 dark:border-rose-800/50", label: "Rosa" },
  { id: "blue", bg: "bg-blue-100 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800/50", label: "Azul" },
  { id: "green", bg: "bg-green-100 dark:bg-green-950/40", border: "border-green-200 dark:border-green-800/50", label: "Verde" },
  { id: "yellow", bg: "bg-yellow-100 dark:bg-yellow-950/40", border: "border-yellow-200 dark:border-yellow-800/50", label: "Amarillo" },
  { id: "purple", bg: "bg-purple-100 dark:bg-purple-950/40", border: "border-purple-200 dark:border-purple-800/50", label: "Lila" },
]

export const DEFAULT_NOTE_COLOR = {
  bg: "bg-white dark:bg-[#1C1D1D]",
  border: "border-slate-200/60 dark:border-slate-800/60"
}

export function getNoteColor(colorId: string | null) {
  if (!colorId) return DEFAULT_NOTE_COLOR
  const found = NOTE_COLORS.find((c) => c.id === colorId)
  return found ? { bg: found.bg, border: found.border } : DEFAULT_NOTE_COLOR
}
