import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { taskScopeWhere } from "@/lib/task-permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"
import {
  BarChart4,
  PieChart,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Sparkles
} from "lucide-react"

export default async function ReportesPage() {
  const user = await getSessionUser()
  if (!user) return null

  const tasks = await prisma.task.findMany({
    where: taskScopeWhere(user),
    include: {
      assignedUsers: { select: { id: true, name: true } }
    }
  })

  const total = tasks.length
  const pending = tasks.filter((t) => t.status === "PENDING").length
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length
  const done = tasks.filter((t) => t.status === "DONE").length

  const low = tasks.filter((t) => t.priority === "LOW").length
  const medium = tasks.filter((t) => t.priority === "MEDIUM").length
  const high = tasks.filter((t) => t.priority === "HIGH").length

  const now = Date.now()
  const overdue = tasks.filter((t) => {
    if (t.status === "DONE" || !t.dueDate) return false
    return new Date(t.dueDate).getTime() < now
  }).length

  const efficiency = total > 0 ? Math.round((done / total) * 100) : 0
  const overduePercent = total > 0 ? Math.round((overdue / total) * 100) : 0

  // Calculate tasks per user
  const users = await prisma.user.findMany({
    select: { id: true, name: true }
  })

  const userStats = users.map((u) => {
    const userTasks = tasks.filter((t) => t.assignedUsers.some((au) => au.id === u.id))
    const userDone = userTasks.filter((t) => t.status === "DONE").length
    const userPending = userTasks.length - userDone
    const progress = userTasks.length > 0 ? Math.round((userDone / userTasks.length) * 100) : 0
    return {
      name: u.name,
      total: userTasks.length,
      done: userDone,
      pending: userPending,
      progress
    }
  }).filter((u) => u.total > 0)
    .sort((a, b) => b.total - a.total)

  // Status donut chart SVG computations
  // Donut parameters
  const radius = 50
  const circ = 2 * Math.PI * radius

  const pendingPct = total > 0 ? pending / total : 0
  const inProgressPct = total > 0 ? inProgress / total : 0
  const donePct = total > 0 ? done / total : 0

  const strokePending = circ * pendingPct
  const strokeInProgress = circ * inProgressPct
  const strokeDone = circ * donePct

  const offsetPending = 0
  const offsetInProgress = strokePending
  const offsetDone = strokePending + strokeInProgress

  return (
    <div className="space-y-6">

      {/* Page Title & description */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
            Reportes e Indicadores
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Estadísticas consolidadas del desempeño general y asignaciones del equipo
          </p>
        </div>
        <Badge className="bg-[#016B6B]/15 text-[#016B6B] border-0 dark:text-[#3F9EA2] dark:bg-[#3F9EA2]/10 py-1 px-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span>Tiempo real</span>
        </Badge>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Total Tasks load */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-[#1C1D1D]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-poppins uppercase tracking-wider">
              Volumen Total
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <BarChart4 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
              {total}
            </span>
            <span className="text-xs text-slate-400">tareas registradas</span>
          </div>
        </div>

        {/* Closed Tasks ratio */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-[#1C1D1D]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-poppins uppercase tracking-wider">
              Tasa de Cierre
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
              {efficiency}%
            </span>
            <span className="text-xs text-slate-400">completadas ({done})</span>
          </div>
        </div>

        {/* Active In-progress Tasks */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-[#1C1D1D]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-poppins uppercase tracking-wider">
              En Ejecución
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#016B6B]/15 text-[#016B6B] dark:text-[#3F9EA2] dark:bg-[#3F9EA2]/10">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
              {inProgress}
            </span>
            <span className="text-xs text-slate-400">en desarrollo</span>
          </div>
        </div>

        {/* Overdue tasks ratio */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-[#1C1D1D]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-poppins uppercase tracking-wider">
              Índice de Atraso
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/20">
              <AlertCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
              {overduePercent}%
            </span>
            <span className="text-xs text-slate-400">vencidas ({overdue})</span>
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid Section */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

        {/* Status Distribution Donut Chart */}
        <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#1C1D1D] rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <CardTitle className="text-sm font-poppins font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="h-4.5 w-4.5 text-[#016B6B] dark:text-[#3F9EA2]" />
              <span>Distribución por Estados</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-around gap-6">

            {/* SVG Donut */}
            {total > 0 ? (
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                  {/* Background Track circle */}
                  <circle cx="60" cy="60" r={radius} fill="transparent" stroke="rgba(241, 245, 249, 0.05)" strokeWidth="12" />

                  {/* Pending segment (Turquoise) */}
                  <circle
                    cx="60" cy="60" r={radius} fill="transparent"
                    stroke="#3F9EA2" strokeWidth="12"
                    strokeDasharray={`${strokePending} ${circ}`}
                    strokeDashoffset={-offsetPending}
                  />

                  {/* In Progress segment (Petroleum Green) */}
                  <circle
                    cx="60" cy="60" r={radius} fill="transparent"
                    stroke="#016B6B" strokeWidth="12"
                    strokeDasharray={`${strokeInProgress} ${circ}`}
                    strokeDashoffset={-offsetInProgress}
                  />

                  {/* Completed segment (Emerald Green) */}
                  <circle
                    cx="60" cy="60" r={radius} fill="transparent"
                    stroke="#22C55E" strokeWidth="12"
                    strokeDasharray={`${strokeDone} ${circ}`}
                    strokeDashoffset={-offsetDone}
                  />
                </svg>
                {/* Center text inside donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-poppins font-black text-slate-850 dark:text-slate-100">{total}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tareas</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-10">Sin datos de tareas para graficar</div>
            )}

            {/* Labels Legend */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-[#3F9EA2] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-350">Pendientes</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{pending} tareas ({total > 0 ? Math.round((pending / total) * 100) : 0}%)</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-[#016B6B] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-350">En desarrollo</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{inProgress} tareas ({total > 0 ? Math.round((inProgress / total) * 100) : 0}%)</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-[#22C55E] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-350">Completadas</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{done} tareas ({total > 0 ? Math.round((done / total) * 100) : 0}%)</div>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Priority distribution */}
        <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#1C1D1D] rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <CardTitle className="text-sm font-poppins font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-[#016B6B] dark:text-[#3F9EA2]" />
              <span>Prioridad y Criticidad</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">

            {/* High priority metric */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span className="text-[#EF4444] font-poppins">Criticidad Alta</span>
                <span>{high} tareas</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#EF4444] rounded-full transition-all" style={{ width: `${total > 0 ? (high / total) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Medium priority metric */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span className="text-[#F59E0B] font-poppins">Criticidad Media</span>
                <span>{medium} tareas</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#F59E0B] rounded-full transition-all" style={{ width: `${total > 0 ? (medium / total) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Low priority metric */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span className="text-[#3F9EA2] font-poppins">Criticidad Baja</span>
                <span>{low} tareas</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#3F9EA2] rounded-full transition-all" style={{ width: `${total > 0 ? (low / total) * 100 : 0}%` }} />
              </div>
            </div>

          </CardContent>
        </Card>

        {/* User Contributions List */}
        <Card className="col-span-full border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#1C1D1D] rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <CardTitle className="text-sm font-poppins font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-[#016B6B] dark:text-[#3F9EA2]" />
              <span>Carga de Trabajo y Desempeño del Equipo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {userStats.map((u) => (
                <div key={u.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-slate-50/20">
                  <div className="min-w-0">
                    <span className="text-xs font-poppins font-black text-slate-800 dark:text-slate-100 block">{u.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">
                      {u.total} {u.total === 1 ? 'tarea asignada' : 'tareas asignadas'}
                    </span>
                  </div>

                  <div className="flex-1 sm:max-w-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Rendimiento</span>
                      <span className="text-[#016B6B] dark:text-[#3F9EA2]">{u.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#016B6B] to-[#3F9EA2] rounded-full transition-all" style={{ width: `${u.progress}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-end text-center">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hechas</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450">{u.done}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pend.</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{u.pending}</span>
                    </div>
                  </div>
                </div>
              ))}

              {userStats.length === 0 && (
                <div className="p-8 text-center text-xs font-semibold text-slate-400">Sin estadísticas de colaboradores disponibles</div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  )
}
