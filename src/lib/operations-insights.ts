import { addDays, endOfMonth, endOfWeek, format, isBefore, isSameDay, startOfMonth, startOfWeek } from "date-fns";
import { getActivityActionLabel, getActivityEntityLabel } from "./module-presenters";

type ReminderPriority = "LOW" | "MEDIUM" | "HIGH";

interface ReminderLike {
  completed: boolean;
  priority: ReminderPriority;
  reminderDate: string | Date;
}

interface ReminderWithId extends ReminderLike {
  id: string;
}

interface CalendarEventLike {
  id: string;
  date: string;
  type: string;
  title: string;
}

interface ActivityLike {
  entityType: "case" | "charge" | "payment" | "expense" | "reminder";
  action: "created" | "updated" | "deleted" | "status_changed" | "due_date_changed";
  note?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
}

const PRIORITY_WEIGHT: Record<ReminderPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function summarizeReminderPanel(reminders: ReminderLike[], now = new Date()) {
  const today = startOfDay(now);
  const nextWeek = addDays(today, 7);

  let pending = 0;
  let completed = 0;
  let highPriority = 0;
  let overdue = 0;
  let dueToday = 0;
  let upcoming = 0;

  for (const reminder of reminders) {
    const reminderDay = startOfDay(toDate(reminder.reminderDate));

    if (reminder.completed) {
      completed += 1;
      continue;
    }

    pending += 1;
    if (reminder.priority === "HIGH") highPriority += 1;
    if (isBefore(reminderDay, today)) overdue += 1;
    else if (isSameDay(reminderDay, today)) dueToday += 1;
    else if (reminderDay <= nextWeek) upcoming += 1;
  }

  return { pending, completed, highPriority, overdue, dueToday, upcoming };
}

export function sortRemindersForPanel<T extends ReminderWithId>(reminders: T[], now = new Date()): T[] {
  const today = startOfDay(now);

  return [...reminders].sort((left, right) => {
    const leftDate = startOfDay(toDate(left.reminderDate));
    const rightDate = startOfDay(toDate(right.reminderDate));
    const leftOverdue = !left.completed && isBefore(leftDate, today);
    const rightOverdue = !right.completed && isBefore(rightDate, today);

    if (leftOverdue !== rightOverdue) {
      return leftOverdue ? -1 : 1;
    }

    const dateDelta = leftDate.getTime() - rightDate.getTime();
    if (dateDelta !== 0) return dateDelta;

    return PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];
  });
}

export function buildCalendarMonth<T extends CalendarEventLike>(referenceDate: Date, events: T[]) {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const eventMap = new Map<string, T[]>();

  for (const event of events) {
    const list = eventMap.get(event.date) ?? [];
    list.push(event);
    eventMap.set(event.date, list);
  }

  const weeks: Array<
    Array<{
      date: Date;
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: T[];
    }>
  > = [];

  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week = [];

    for (let index = 0; index < 7; index += 1) {
      const dateKey = format(cursor, "yyyy-MM-dd");
      week.push({
        date: cursor,
        dateKey,
        dayNumber: cursor.getDate(),
        isCurrentMonth: cursor.getMonth() === referenceDate.getMonth(),
        isToday: isSameDay(cursor, new Date()),
        events: eventMap.get(dateKey) ?? [],
      });

      cursor = addDays(cursor, 1);
    }

    weeks.push(week);
  }

  return weeks;
}

export function describeActivityLogEntry(entry: ActivityLike): string {
  if (entry.note?.trim()) {
    return entry.note.trim();
  }

  const entityLabel = getActivityEntityLabel(entry.entityType);
  const actionLabel = getActivityActionLabel(entry.action).toLowerCase();
  const previousKeys =
    entry.previousValue && typeof entry.previousValue === "object" ? Object.keys(entry.previousValue) : [];
  const newKeys = entry.newValue && typeof entry.newValue === "object" ? Object.keys(entry.newValue) : [];
  const changedKeys = [...new Set([...previousKeys, ...newKeys])];

  if (changedKeys.length > 0) {
    return `${entityLabel} ${actionLabel}: ${changedKeys.join(", ")}`;
  }

  return `${entityLabel} ${actionLabel}`;
}

export function summarizeActivityMetrics(entries: Pick<ActivityLike, "action" | "entityType">[]) {
  const actions = {
    created: 0,
    updated: 0,
    deleted: 0,
    status_changed: 0,
    due_date_changed: 0,
  };

  const entities = {
    case: 0,
    charge: 0,
    payment: 0,
    expense: 0,
    reminder: 0,
  };

  for (const entry of entries) {
    actions[entry.action] += 1;
    entities[entry.entityType] += 1;
  }

  return { actions, entities };
}
