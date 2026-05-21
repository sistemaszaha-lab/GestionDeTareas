import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { taskScopeWhere } from "@/lib/task-permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card"
import { Badge } from "@/components/shadcn/ui/badge"
import { FolderKanban, Clock, CheckCircle2, AlertTriangle } from "lucide-react"

export default async function ProyectosPage() {
  const user = await getSessionUser()
  if (!user) return null

  const tasks = await prisma.task.findMany({
    where: taskScopeWhere(user),
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true
    }
  })

  // Agrupar todas las tareas bajo un único proyecto "Operaciones Generales"
  const projTasks = tasks
  const total = projTasks.length
  const completed = projTasks.filter((t) => t.status === "DONE").length
  const pending = total - completed
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  const now = Date.now()
  const overdue = projTasks.filter((t) => {
    if (t.status === "DONE" || !t.dueDate) return false
    return new Date(t.dueDate).getTime() < now
  }).length

  const projects = [
    {
      name: "Operaciones Generales",
      total,
      completed,
      pending,
      progress,
      overdue,
      tasks: projTasks,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-poppins font-black tracking-tight text-[#464747] dark:text-[#F8FAFA]">
          Proyectos del Equipo
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Seguimiento dinámico del progreso agrupado por etiquetas de tareas
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card 
            key={project.name} 
            className="overflow-hidden border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-[#1C1D1D] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group"
          >
            <CardHeader className="pb-3 bg-slate-50/20 dark:bg-[#121313]/10 border-b border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#016B6B]/15 text-[#016B6B] dark:text-[#3F9EA2]">
                    <FolderKanban className="h-4.5 w-4.5" />
                  </div>
                  <CardTitle className="text-sm font-poppins font-black text-slate-800 dark:text-slate-100 truncate">
                    {project.name}
                  </CardTitle>
                </div>
                <Badge className="bg-slate-100 text-slate-650 border-0 dark:bg-slate-800 dark:text-slate-350 text-[10px] font-bold py-0.5 px-2">
                  {project.total} {project.total === 1 ? 'tarea' : 'tareas'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              
              {/* Progress Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Progreso</span>
                  <span className="text-[#016B6B] dark:text-[#3F9EA2]">{project.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#016B6B] to-[#3F9EA2] rounded-full transition-all duration-500" 
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 text-center border-t border-slate-100 dark:border-slate-800/60">
                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completadas</span>
                  <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{project.completed}</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes</span>
                  <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{project.pending}</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atrasadas</span>
                  <div className="flex items-center justify-center gap-1 text-xs font-bold text-rose-500">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{project.overdue}</span>
                  </div>
                </div>
              </div>

              {/* Tags inside Project preview */}
              <div className="flex flex-wrap gap-1 pt-1.5">
                {project.tasks.slice(0, 3).map((task) => (
                  <span 
                    key={task.id} 
                    className="text-[9px] font-semibold text-slate-450 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/40 rounded px-1.5 py-0.5 block truncate max-w-[12ch]"
                    title={task.title}
                  >
                    {task.title}
                  </span>
                ))}
                {project.tasks.length > 3 && (
                  <span className="text-[9px] font-bold text-slate-400 px-1 py-0.5">
                    +{project.tasks.length - 3} más
                  </span>
                )}
              </div>

            </CardContent>
          </Card>
        ))}

        {projects.length === 0 && (
          <Card className="col-span-full border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center rounded-2xl bg-white dark:bg-slate-900/10">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <FolderKanban className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">No hay proyectos activos</h3>
            <p className="text-xs text-slate-500 mt-1">Crea tareas con etiquetas para generar tableros de proyectos automáticamente.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
