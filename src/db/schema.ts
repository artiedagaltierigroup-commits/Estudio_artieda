import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  decimal,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const caseStatusEnum = pgEnum("case_status", ["ACTIVE", "CLOSED", "SUSPENDED"]);
export const casePriorityEnum = pgEnum("case_priority", ["LOW", "MEDIUM", "HIGH"]);
export const chargeStatusEnum = pgEnum("charge_status", ["PENDING", "PARTIAL", "PAID", "OVERDUE"]);
export const expenseTypeEnum = pgEnum("expense_type", ["OPERATIVE", "TAX", "SERVICE", "OTHER"]);
export const frequencyEnum = pgEnum("frequency", ["monthly", "quarterly", "yearly"]);
export const reminderPriorityEnum = pgEnum("reminder_priority", ["LOW", "MEDIUM", "HIGH"]);
export const entityTypeEnum = pgEnum("entity_type", ["case", "charge", "payment", "expense", "reminder"]);
export const actionTypeEnum = pgEnum("action_type", [
  "created",
  "updated",
  "deleted",
  "status_changed",
  "due_date_changed",
]);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    taxId: text("tax_id"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    languages: text("languages"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("clients_user_id_idx").on(table.userId),
    nameIdx: index("clients_name_idx").on(table.name),
  })
);

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: caseStatusEnum("status").notNull().default("ACTIVE"),
    priority: casePriorityEnum("priority").notNull().default("MEDIUM"),
    fee: decimal("fee", { precision: 12, scale: 2 }),
    preferredPaymentMethod: text("preferred_payment_method"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("cases_user_id_idx").on(table.userId),
    clientIdx: index("cases_client_id_idx").on(table.clientId),
    clientStatusIdx: index("cases_user_client_status_idx").on(table.userId, table.clientId, table.status),
    priorityIdx: index("cases_priority_idx").on(table.priority),
    dateOrderCheck: check(
      "cases_date_order_check",
      sql`${table.endDate} IS NULL OR ${table.startDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
  })
);

export const charges = pgTable(
  "charges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amountTotal: decimal("amount_total", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date"),
    followUpDate: date("follow_up_date"),
    status: chargeStatusEnum("status").notNull().default("PENDING"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("charges_user_id_idx").on(table.userId),
    caseIdx: index("charges_case_id_idx").on(table.caseId),
    dueDateIdx: index("charges_due_date_idx").on(table.userId, table.dueDate),
    followUpDateIdx: index("charges_follow_up_date_idx").on(table.userId, table.followUpDate),
    statusIdx: index("charges_user_case_status_idx").on(table.userId, table.caseId, table.status),
    cancelledAtIdx: index("charges_cancelled_at_idx").on(table.cancelledAt),
    amountPositiveCheck: check("charges_amount_positive_check", sql`${table.amountTotal} > 0`),
  })
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    chargeId: uuid("charge_id")
      .notNull()
      .references(() => charges.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paymentDate: date("payment_date").notNull(),
    method: text("method"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("payments_user_id_idx").on(table.userId),
    chargeIdIdx: index("payments_charge_id_idx").on(table.chargeId),
    paymentDateIdx: index("payments_payment_date_idx").on(table.userId, table.paymentDate),
    amountPositiveCheck: check("payments_amount_positive_check", sql`${table.amount} > 0`),
  })
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    description: text("description").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    type: expenseTypeEnum("type").notNull().default("OPERATIVE"),
    category: text("category"),
    date: date("date").notNull(),
    appliesToMonth: date("applies_to_month"),
    receiptUrl: text("receipt_url"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("expenses_user_id_idx").on(table.userId),
    dateIdx: index("expenses_date_idx").on(table.userId, table.date),
    appliesToMonthIdx: index("expenses_applies_to_month_idx").on(table.userId, table.appliesToMonth),
    voidedAtIdx: index("expenses_voided_at_idx").on(table.voidedAt),
    amountPositiveCheck: check("expenses_amount_positive_check", sql`${table.amount} > 0`),
  })
);

export const recurringExpenses = pgTable(
  "recurring_expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    description: text("description").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    type: expenseTypeEnum("type").notNull().default("OPERATIVE"),
    category: text("category"),
    frequency: frequencyEnum("frequency").notNull().default("monthly"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("recurring_expenses_user_id_idx").on(table.userId),
    activeIdx: index("recurring_expenses_active_idx").on(table.userId, table.active),
    frequencyIdx: index("recurring_expenses_frequency_idx").on(table.frequency),
    amountPositiveCheck: check("recurring_expenses_amount_positive_check", sql`${table.amount} > 0`),
    dateOrderCheck: check(
      "recurring_expenses_date_order_check",
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
  })
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    reminderDate: timestamp("reminder_date", { withTimezone: true }).notNull(),
    priority: reminderPriorityEnum("priority").notNull().default("MEDIUM"),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("reminders_user_id_idx").on(table.userId),
    reminderDateIdx: index("reminders_date_idx").on(table.userId, table.reminderDate),
    completionIdx: index("reminders_completion_idx").on(table.userId, table.completed),
    caseIdx: index("reminders_case_idx").on(table.userId, table.caseId),
    clientIdx: index("reminders_client_idx").on(table.userId, table.clientId),
  })
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    entityType: entityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: actionTypeEnum("action").notNull(),
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("activity_log_user_id_idx").on(table.userId),
    createdAtIdx: index("activity_log_created_at_idx").on(table.userId, table.createdAt),
    entityIdx: index("activity_log_entity_idx").on(table.entityType, table.entityId),
  })
);

export const clientsRelations = relations(clients, ({ many }) => ({
  cases: many(cases),
  reminders: many(reminders),
}));

export const casesRelations = relations(cases, ({ many, one }) => ({
  client: one(clients, { fields: [cases.clientId], references: [clients.id] }),
  charges: many(charges),
  reminders: many(reminders),
}));

export const chargesRelations = relations(charges, ({ many, one }) => ({
  case: one(cases, { fields: [charges.caseId], references: [cases.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  charge: one(charges, { fields: [payments.chargeId], references: [charges.id] }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  case: one(cases, { fields: [reminders.caseId], references: [cases.id] }),
  client: one(clients, { fields: [reminders.clientId], references: [clients.id] }),
}));
