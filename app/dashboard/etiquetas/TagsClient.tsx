"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Input } from "@/components/shadcn/ui/input"
import { Badge } from "@/components/shadcn/ui/badge"
import { 
  Search, 
  TrendingUp, 
  Clock, 
  AlertCircle 
} from "lucide-react"
import { cn } from "@/lib/ui"

type SimpleTask = {
  id: string
  tags: string[]
  status: "PENDING" | "IN_PROGRESS" | "DONE"
}

// Helper to generate a deterministic color palette based on string hash
function getTagColor(name: string) {
  const colors = [
    { bg: "bg-[#016B6B]/10 dark:bg-[#016B6B]/15", text: "text-[#016B6B] dark:text-[#3F9EA2]", border: "border-[#016B6B]/20" },
    { bg: "bg-[#3F9EA2]/10 dark:bg-[#3F9EA2]/15", text: "text-[#3F9EA2]", border: "border-[#3F9EA2]/20" },
    { bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-600 dark:text-emerald-450", border: "border-emerald-100 dark:border-emerald-900/30" },
    { bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-600 dark:text-amber-450", border: "border-amber-100 dark:border-amber-900/30" },
    { bg: "bg-purple-50 dark:bg-purple-950/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-100 dark:border-purple-900/30" },
    { bg: "bg-indigo-50 dark:bg-indigo-950/20", text: "text-indigo-650 dark:text-indigo-400", border: "border-indigo-100 dark:border-indigo-900/30" }
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

export default function TagsClient({ initialTasks }: { initialTasks: SimpleTask[] }) {
  const [search, setSearch] = useState("")

  // Group tags and aggregate data
  const tagsStats = useMemo(() => {
    const map: Record<string, { total: number; pending: number; inProgress: number; done: number }> = {}

    initialTasks.forEach((task) => {
      task.tags.forEach((rawTag) => {
        const tag = rawTag.trim()
        if (!tag) return
        if (!map[tag]) {
          map[tag] = { total: 0, pending: 0, inProgress: 0, done: 0 }
        }
        map[tag].total += 1
        if (task.status === "PENDING") map[tag].pending += 1
        else if (task.status === "IN_PROGRESS") map[tag].inProgress += 1
        else if (task.status === "DONE") map[tag].done += 1
      })
    })

    return Object.entries(map).map(([name, stats]) => {
      const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
      return {
        name,
        ...stats,
        progress
      }
    }).sort((a, b) => b.total - a.total)
  }, [initialTasks])

  // Filter tags based on search input
  const filteredTags = useMemo(() => {
    if (!search.trim()) return tagsStats
    const q = search.toLowerCase()
    return tagsStats.filter((t) => t.name.toLowerCase().includes(q))
  }, [tagsStats, search])

  // KPI analytics
  const kpis = useMemo(() => {
    const totalTags = tagsStats.length
    const activeTags = tagsStats.filter((t) => t.pending + t.inProgress > 0).length
    const topTag = tagsStats[0]?.name || "Ninguna"
    const avgProgress = tagsStats.length > 0 
      ? Math.round(tagsStats.reduce((acc, curr) => acc + curr.progress, 0) / tagsStats.length)
      : 0

    return { totalTags, activeTags, topTag, avgProgress }
  }, [tagsStats])

  return (
    <div className="space-y-6">
      
      {/* Page header and title */}
      <div>
        <h1 className="text-xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
          Gestión de Etiquetas
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Monitorea y analiza el rendimiento de tus flujos de trabajo organizados por etiquetas
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Unique Tags */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-[#1C1D1D]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-poppins uppercase tracking-wider">
              Total Etiquetas
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#016B6B]/15 text-[#016B6B] dark:text-[#3F9EA2]">
              <span className="text-xs font-black">#</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
              {kpis.totalTags}
            </span>
            <span className="text-xs text-slate-400">únicas</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#3F9EA2]" />
        </div>

        {/* Active Tags */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-[#1C1D1D]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-poppins uppercase tracking-wider">
              Etiquetas Activas
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#016B6B]/10 text-[#016B6B] dark:text-[#3F9EA2] dark:bg-[#3F9EA2]/10">
              <span className="text-xs font-black">A</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
              {kpis.activeTags}
            </span>
            <span className="text-xs text-slate-400">con tareas pendientes</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#016B6B]" />
        </div>

        {/* Most used Tag */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-[#1C1D1D]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-poppins uppercase tracking-wider">
              Más Utilizada
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/20">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA] truncate max-w-[15ch]">
              {kpis.topTag}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">top</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>

        {/* Average Progress */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-[#1C1D1D]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-poppins uppercase tracking-wider">
              Cierre Promedio
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20">
              <span className="text-xs font-black">%</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
              {kpis.avgProgress}%
            </span>
            <span className="text-xs text-slate-400">completado</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Buscar etiqueta por nombre..." 
            className="h-9.5 pl-10 rounded-xl"
          />
        </div>
      </div>

      {/* Grid of tags */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTags.map((tag) => {
          const colors = getTagColor(tag.name)

          return (
            <Card 
              key={tag.name} 
              className="border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#1C1D1D] rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
            >
              <CardContent className="p-4.5 space-y-3.5">
                
                {/* Header Tag block */}
                <div className="flex items-center justify-between">
                  <Badge className={cn("text-xs font-poppins font-black uppercase tracking-wider py-1 px-3.5 rounded-lg border", colors.bg, colors.text, colors.border)}>
                    {tag.name}
                  </Badge>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {tag.total} {tag.total === 1 ? 'tarea' : 'tareas'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Efectividad</span>
                    <span className={colors.text}>{tag.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#016B6B] to-[#3F9EA2] rounded-full transition-all duration-300"
                      style={{ width: `${tag.progress}%` }}
                    />
                  </div>
                </div>

                {/* Details grid list */}
                <div className="grid grid-cols-3 gap-1 text-center pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pend.</span>
                    <span className="text-xs font-bold text-[#3F9EA2]">{tag.pending}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Prog.</span>
                    <span className="text-xs font-bold text-[#016B6B] dark:text-[#3F9EA2]">{tag.inProgress}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hechas</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450">{tag.done}</span>
                  </div>
                </div>

              </CardContent>
            </Card>
          )
        })}

        {filteredTags.length === 0 && (
          <Card className="col-span-full border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center rounded-2xl bg-white dark:bg-slate-900/10">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-700">
              <span className="text-sm font-black">#</span>
            </div>
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">No se encontraron etiquetas</h3>
            <p className="text-xs text-slate-500 mt-1">Intenta buscar otro término o crea etiquetas nuevas en tus tareas.</p>
          </Card>
        )}
      </div>

    </div>
  )
}
