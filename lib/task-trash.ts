import fs from "fs/promises"
import path from "path"
import type { Prisma, TaskStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { taskScopeWhere, trashedTaskScopeWhere, type TaskSessionUser } from "@/lib/task-permissions"

const allowedStatuses: TaskStatus[] = ["PENDING", "IN_PROGRESS", "DONE"]
const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000

type AttachmentRecord = {
  id: string
  name: string
  url: string
  type: "file" | "link"
  fileType?: string
  createdAt?: string
}

type RestoredTaskSummary = {
  id: string
  title: string
  status: TaskStatus
  assignedUsers: Array<{ id: string; name: string; username: string }>
  attachments: AttachmentRecord[]
}

function isValidTaskStatus(value: string): value is TaskStatus {
  return (allowedStatuses as string[]).includes(value)
}

function deletedMeta(userId: string) {
  return {
    deletedAt: new Date(),
    deletedById: userId
  }
}

function restoreMeta() {
  return {
    deletedAt: null,
    deletedById: null
  }
}

function normalizeAttachments(value: unknown): AttachmentRecord[] {
  if (!Array.isArray(value)) return []

  return value.filter(
    (attachment): attachment is AttachmentRecord =>
      Boolean(
        attachment &&
          typeof attachment === "object" &&
          "id" in attachment &&
          "name" in attachment &&
          "url" in attachment &&
          "type" in attachment
      )
  )
}

function attachmentFilePath(attachment: AttachmentRecord) {
  if (attachment.type !== "file") return null
  if (!attachment.url.startsWith("/uploads/")) return null
  return path.join(process.cwd(), "public", attachment.url.replace(/^\/+/, "").replaceAll("/", path.sep))
}

function dedupeWarnings(warnings: string[]) {
  return Array.from(new Set(warnings))
}

async function collectRestoreWarnings(tasks: RestoredTaskSummary[]) {
  const warnings: string[] = []

  for (const task of tasks) {
    if (task.assignedUsers.length === 0) {
      warnings.push(`La tarea "${task.title}" se restauró sin usuarios asignados vigentes.`)
    }

    for (const attachment of task.attachments) {
      const filePath = attachmentFilePath(attachment)
      if (!filePath) continue

      try {
        await fs.access(filePath)
      } catch {
        warnings.push(`No se encontró el archivo adjunto "${attachment.name}" para la tarea "${task.title}".`)
      }
    }
  }

  return dedupeWarnings(warnings)
}

async function cleanupDeletedAttachments(taskTitleById: Map<string, string>, attachmentsByTaskId: Map<string, AttachmentRecord[]>) {
  const warnings: string[] = []

  for (const [taskId, attachments] of attachmentsByTaskId.entries()) {
    const taskTitle = taskTitleById.get(taskId) ?? "Tarea"

    for (const attachment of attachments) {
      const filePath = attachmentFilePath(attachment)
      if (!filePath) continue

      try {
        await fs.unlink(filePath)
      } catch (error) {
        const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code ?? "") : ""
        if (code === "ENOENT") {
          warnings.push(`El archivo "${attachment.name}" ya no existía al eliminar permanentemente "${taskTitle}".`)
          continue
        }

        warnings.push(`No se pudo borrar el archivo "${attachment.name}" de "${taskTitle}".`)
      }
    }
  }

  return dedupeWarnings(warnings)
}

function restoreTaskSelect() {
  return {
    id: true,
    title: true,
    status: true,
    attachments: true,
    assignedUsers: { select: { id: true, name: true, username: true } }
  } as const
}

function permanentDeleteSelect() {
  return {
    id: true,
    title: true,
    attachments: true
  } as const
}

async function permanentlyDeleteTasksInternal(taskIds: string[]) {
  const normalizedTaskIds = normalizeTaskIds(taskIds)
  if (normalizedTaskIds.length === 0) return { deletedCount: 0, warnings: [] }

  const tasks = await prisma.task.findMany({
    where: { id: { in: normalizedTaskIds }, deletedAt: { not: null } },
    select: permanentDeleteSelect()
  })

  const attachmentsByTaskId = new Map<string, AttachmentRecord[]>()
  const taskTitleById = new Map<string, string>()

  for (const task of tasks) {
    attachmentsByTaskId.set(task.id, normalizeAttachments(task.attachments))
    taskTitleById.set(task.id, task.title)
  }

  const existingTaskIds = tasks.map((task) => task.id)

  await prisma.$transaction(async (tx) => {
    await tx.comment.deleteMany({
      where: { taskId: { in: existingTaskIds } }
    })

    for (const taskId of existingTaskIds) {
      await tx.task.update({
        where: { id: taskId },
        data: {
          assignedUsers: { set: [] }
        }
      })
    }

    await tx.task.deleteMany({
      where: { id: { in: existingTaskIds } }
    })
  })

  return {
    deletedCount: tasks.length,
    warnings: await cleanupDeletedAttachments(taskTitleById, attachmentsByTaskId)
  }
}

export function getTrashDeadline(deletedAt: Date | string) {
  const deletedAtDate = deletedAt instanceof Date ? deletedAt : new Date(deletedAt)
  return new Date(deletedAtDate.getTime() + THIRTY_DAYS_IN_MS)
}

export function getTrashPurgeCutoff(now = new Date()) {
  return new Date(now.getTime() - THIRTY_DAYS_IN_MS)
}

export async function moveTasksToTrash(params: {
  user: TaskSessionUser
  taskIds: string[]
  columnId: TaskStatus
}) {
  const taskIds = normalizeTaskIds(params.taskIds)
  if (taskIds.length === 0) {
    throw new Error("Debes seleccionar al menos una tarea.")
  }

  return prisma.$transaction(async (tx) => {
    const where: Prisma.TaskWhereInput = {
      id: { in: taskIds },
      ...taskScopeWhere(params.user),
      status: params.columnId,
      deletedAt: null
    }

    const tasks = await tx.task.findMany({
      where,
      select: { id: true, status: true }
    })

    if (tasks.length !== taskIds.length) {
      throw new Error("Una o más tareas no pertenecen a la columna seleccionada o ya están en la papelera.")
    }

    const now = new Date()
    await tx.task.updateMany({
      where: {
        id: { in: taskIds },
        ...taskScopeWhere(params.user),
        status: params.columnId,
        deletedAt: null
      },
      data: {
        deletedAt: now,
        deletedById: params.user.id
      }
    })

    return now
  })
}

export async function restoreTasks(params: { user: TaskSessionUser; taskIds: string[] }) {
  const taskIds = normalizeTaskIds(params.taskIds)
  if (taskIds.length === 0) {
    throw new Error("Debes seleccionar al menos una tarea.")
  }

  const tasks = await prisma.$transaction(async (tx) => {
    const trashedTasks = await tx.task.findMany({
      where: {
        id: { in: taskIds },
        ...trashedTaskScopeWhere(params.user)
      },
      select: { id: true, status: true, deletedAt: true }
    })

    if (trashedTasks.length !== taskIds.length) {
      throw new Error("Una o más tareas no están en la papelera o no tienes permiso para restaurarlas.")
    }

    for (const task of trashedTasks) {
      if (!isValidTaskStatus(task.status)) {
        throw new Error("No se pudo restaurar una tarea porque su columna original no es válida.")
      }
    }

    await tx.task.updateMany({
      where: {
        id: { in: taskIds },
        ...trashedTaskScopeWhere(params.user)
      },
      data: restoreMeta()
    })

    return tx.task.findMany({
      where: { id: { in: taskIds } },
      select: restoreTaskSelect()
    })
  })

  const normalizedTasks = tasks.map((task) => ({
    ...task,
    attachments: normalizeAttachments(task.attachments)
  }))

  return {
    tasks,
    warnings: await collectRestoreWarnings(normalizedTasks)
  }
}

export async function restoreTaskToColumn(params: {
  user: TaskSessionUser
  taskId: string
  columnId: TaskStatus
}) {
  const task = await prisma.$transaction(async (tx) => {
    const trashedTask = await tx.task.findFirst({
      where: {
        id: params.taskId,
        ...trashedTaskScopeWhere(params.user)
      },
      select: { id: true, status: true, deletedAt: true }
    })

    if (!trashedTask) {
      throw new Error("Tarea no encontrada en la papelera.")
    }

    if (!isValidTaskStatus(params.columnId)) {
      throw new Error("Debes elegir una columna válida.")
    }

    await tx.task.update({
      where: { id: params.taskId },
      data: {
        status: params.columnId,
        ...restoreMeta()
      }
    })

    return tx.task.findUniqueOrThrow({
      where: { id: params.taskId },
      select: restoreTaskSelect()
    })
  })

  return {
    task,
    warnings: await collectRestoreWarnings([
      {
        ...task,
        attachments: normalizeAttachments(task.attachments)
      }
    ])
  }
}

export async function softDeleteSingleTask(params: { user: TaskSessionUser; taskId: string }) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({
      where: {
        id: params.taskId,
        ...taskScopeWhere(params.user),
        deletedAt: null
      },
      select: { id: true, status: true }
    })

    if (!task) {
      throw new Error("Tarea no encontrada.")
    }

    await tx.task.update({
      where: { id: params.taskId },
      data: deletedMeta(params.user.id)
    })

    return task
  })
}

export async function permanentlyDeleteTasks(params: { user: TaskSessionUser; taskIds: string[] }) {
  const taskIds = normalizeTaskIds(params.taskIds)
  if (taskIds.length === 0) {
    throw new Error("Debes seleccionar al menos una tarea.")
  }

  const tasks = await prisma.task.findMany({
    where: {
      id: { in: taskIds },
      ...trashedTaskScopeWhere(params.user)
    },
    select: permanentDeleteSelect()
  })

  if (tasks.length !== taskIds.length) {
    throw new Error("Una o más tareas no están en la papelera o no tienes permiso para eliminarlas permanentemente.")
  }

  return permanentlyDeleteTasksInternal(taskIds)
}

export async function purgeExpiredTrash(batchSize = 25) {
  let deletedCount = 0
  let batches = 0
  const warnings: string[] = []

  while (true) {
    const expiredTasks = await prisma.task.findMany({
      where: {
        deletedAt: {
          not: null,
          lte: getTrashPurgeCutoff()
        }
      },
      select: { id: true },
      orderBy: { deletedAt: "asc" },
      take: batchSize
    })

    if (expiredTasks.length === 0) break

    const result = await permanentlyDeleteTasksInternal(expiredTasks.map((task) => task.id))
    deletedCount += result.deletedCount
    warnings.push(...result.warnings)
    batches += 1
  }

  return {
    deletedCount,
    batches,
    warnings: dedupeWarnings(warnings)
  }
}

export function isAllowedStatus(value: string): value is TaskStatus {
  return isValidTaskStatus(value)
}

export function normalizeTaskIds(taskIds: string[]) {
  return Array.from(new Set(taskIds.map((id) => id.trim()).filter(Boolean)))
}
