import type { TaskPriority, TaskStatus } from "@prisma/client"

export const REMINDER_TIME_ZONE = "America/Mexico_City"
export type ReminderType = "OVERDUE" | "DUE_TODAY" | "PENDING"

export type ReminderTask = {
  id: string
  title: string
  priority: TaskPriority
  dueDate: Date | null
  status?: TaskStatus
  deletedAt?: Date | null
  assignedUsers: Array<{ id: string; name: string; email: string }>
}

export type ReminderTaskItem = {
  id: string
  title: string
  priority: TaskPriority
  dueDate: string | null
  assignedUser: { id: string; name: string; email: string }
}

export type ReminderNotification = {
  type: ReminderType
  task: ReminderTaskItem
  daysOverdue: number
}

export function getMexicoDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REMINDER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

/** Preserve the natural date selected in the UI, stored as UTC end-of-day. */
export function getStoredDueDateKey(dueDate: Date | string): string {
  const date = dueDate instanceof Date ? dueDate : new Date(dueDate)
  if (Number.isNaN(date.getTime())) throw new Error("Invalid due date")
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-")
}

function differenceInNaturalDays(fromDateKey: string, toDateKey: string): number {
  const from = new Date(`${fromDateKey}T00:00:00.000Z`)
  const to = new Date(`${toDateKey}T00:00:00.000Z`)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

export function classifyReminder(dueDate: Date | null, todayKey: string): { type: ReminderType; daysOverdue: number } {
  if (!dueDate) return { type: "PENDING", daysOverdue: 0 }
  const dueDateKey = getStoredDueDateKey(dueDate)
  if (dueDateKey < todayKey) {
    return { type: "OVERDUE", daysOverdue: differenceInNaturalDays(dueDateKey, todayKey) }
  }
  if (dueDateKey === todayKey) return { type: "DUE_TODAY", daysOverdue: 0 }
  return { type: "PENDING", daysOverdue: 0 }
}

function toTaskItem(task: ReminderTask, assignedUser: ReminderTask["assignedUsers"][number]): ReminderTaskItem {
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    assignedUser
  }
}

export function buildReminderNotifications(tasks: ReminderTask[], now = new Date()) {
  const todayKey = getMexicoDateKey(now)
  const notifications: ReminderNotification[] = []

  for (const task of tasks) {
    if (task.status === "DONE" || task.deletedAt !== undefined && task.deletedAt !== null) continue
    const classification = classifyReminder(task.dueDate, todayKey)
    for (const assignedUser of task.assignedUsers) {
      notifications.push({
        type: classification.type,
        task: toTaskItem(task, assignedUser),
        daysOverdue: classification.daysOverdue
      })
    }
  }

  const dueToday = notifications
    .filter((notification) => notification.type === "DUE_TODAY")
    .map((notification) => notification.task)
  const upcoming = notifications
    .filter((notification) => {
      if (notification.type !== "PENDING" || !notification.task.dueDate) return false
      const dueDateKey = getStoredDueDateKey(notification.task.dueDate)
      const daysUntilDue = differenceInNaturalDays(todayKey, dueDateKey)
      return daysUntilDue > 0 && daysUntilDue <= 7
    })
    .map((notification) => notification.task)

  return { notifications, dueToday, upcoming }
}
