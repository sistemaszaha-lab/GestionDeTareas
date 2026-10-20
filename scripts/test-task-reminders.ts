import assert from "node:assert/strict"
import test from "node:test"
import { buildReminderNotifications, classifyReminder, getMexicoDateKey, getStoredDueDateKey } from "../lib/task-reminders"

const today = "2026-10-20"
const task = (id: string, dueDate: string | null) => ({
  id,
  title: `Task ${id}`,
  priority: "MEDIUM" as const,
  dueDate: dueDate ? new Date(`${dueDate}T23:59:59.999Z`) : null,
  assignedUsers: [{ id: `user-${id}`, name: "Usuario", email: `${id}@example.com` }]
})

test("preserves the stored natural due date", () => {
  assert.equal(getStoredDueDateKey(new Date("2026-10-20T23:59:59.999Z")), "2026-10-20")
})

test("gets today's natural date in Mexico City across UTC boundaries", () => {
  assert.equal(getMexicoDateKey(new Date("2026-10-21T05:30:00.000Z")), "2026-10-20")
  assert.equal(getMexicoDateKey(new Date("2026-10-21T06:30:00.000Z")), "2026-10-21")
})

test("classifies overdue tasks and counts natural days", () => {
  assert.deepEqual(classifyReminder(new Date("2026-10-19T23:59:59.999Z"), today), { type: "OVERDUE", daysOverdue: 1 })
  assert.deepEqual(classifyReminder(new Date("2026-10-15T23:59:59.999Z"), today), { type: "OVERDUE", daysOverdue: 5 })
})

test("classifies today, future and no-date tasks exclusively", () => {
  assert.equal(classifyReminder(new Date("2026-10-20T23:59:59.999Z"), today).type, "DUE_TODAY")
  assert.equal(classifyReminder(new Date("2026-10-21T23:59:59.999Z"), today).type, "PENDING")
  assert.equal(classifyReminder(null, today).type, "PENDING")
})

test("builds one notification per assigned user and preserves legacy views", () => {
  const multiAssigned = task("multi", "2026-10-22")
  multiAssigned.assignedUsers.push({ id: "user-two", name: "Otra Persona", email: "two@example.com" })
  const result = buildReminderNotifications([
    task("overdue", "2026-10-19"),
    task("today", "2026-10-20"),
    multiAssigned,
    task("no-date", null)
  ], new Date("2026-10-20T18:00:00.000Z"))

  assert.deepEqual(result.notifications.map((item) => item.type), ["OVERDUE", "DUE_TODAY", "PENDING", "PENDING", "PENDING"])
  assert.equal(result.dueToday.length, 1)
  assert.equal(result.upcoming.length, 2)
  assert.equal(result.notifications.every((item) => item.task.assignedUser.email), true)
})

test("excludes completed and trashed tasks", () => {
  const completed = { ...task("completed", "2026-10-20"), status: "DONE" as const }
  const trashed = { ...task("trashed", "2026-10-20"), deletedAt: new Date("2026-10-19T12:00:00.000Z") }
  const result = buildReminderNotifications([completed, trashed, task("active", "2026-10-20")], new Date("2026-10-20T18:00:00.000Z"))
  assert.deepEqual(result.notifications.map((item) => item.task.id), ["active"])
})
