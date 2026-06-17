import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  decimal,
  integer,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const caseStatusEnum = pgEnum("case_status", ["ACTIVE", "CLOSED", "SUSPENDED"]);
export const casePriorityEnum = pgEnum("case_priority", ["LOW", "MEDIUM", "HIGH"]);
export const chargeStatusEnum = pgEnum("charge_status", ["PENDING", "PARTIAL", "PAID", "OVERDUE"]);
export const expenseTypeEnum = pgEnum("expense_type", ["OPERATIVE", "TAX", "SERVICE", "OTHER"]);
export const frequencyEnum = pgEnum("frequency", ["monthly", "quarterly", "semiannual", "yearly"]);
export const reminderPriorityEnum = pgEnum("reminder_priority", ["LOW", "MEDIUM", "HIGH"]);
export const recurringExpenseModeEnum = pgEnum("recurring_expense_mode", ["AUTOMATIC", "PAYABLE"]);
export const recurringExpenseOccurrenceStatusEnum = pgEnum("recurring_expense_occurrence_status", [
  "PENDING",
  "PAID",
  "OVERDUE",
  "GENERATED",
]);
export const expenseOriginEnum = pgEnum("expense_origin", ["MANUAL", "RECURRING_AUTOMATIC", "RECURRING_PAYABLE", "SAVINGS"]);
export const savingsGoalStatusEnum = pgEnum("savings_goal_status", ["IN_PROGRESS", "PAUSED"]);
export const signatureRequestStatusEnum = pgEnum("signature_request_status", [
  "DRAFT",
  "READY",
  "SENT",
  "EMAIL_OPENED",
  "LINK_OPENED",
  "DOCUMENT_VIEWED",
  "SIGNING_STARTED",
  "SIGNING_INTERRUPTED",
  "SIGNED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
]);
export const signatureEventTypeEnum = pgEnum("signature_event_type", [
  "created",
  "document_uploaded",
  "placement_selected",
  "sent",
  "email_opened",
  "link_opened",
  "document_viewed",
  "signing_started",
  "signing_interrupted",
  "signed",
  "rejected",
  "expired",
  "cancelled",
  "resent",
  "downloaded",
]);
export const entityTypeEnum = pgEnum("entity_type", [
  "case",
  "charge",
  "document",
  "payment",
  "expense",
  "reminder",
  "savings_goal",
  "savings_contribution",
  "signature_request",
]);
export const actionTypeEnum = pgEnum("action_type", [
  "created",
  "updated",
  "deleted",
  "status_changed",
  "due_date_changed",
  "sent",
  "signed",
  "resent",
  "cancelled",
  "downloaded",
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

export const savingsGoals = pgTable(
  "savings_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    targetAmount: decimal("target_amount", { precision: 12, scale: 2 }).notNull(),
    deadline: date("deadline"),
    status: savingsGoalStatusEnum("status").notNull().default("IN_PROGRESS"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("savings_goals_user_id_idx").on(table.userId),
    statusIdx: index("savings_goals_status_idx").on(table.userId, table.status),
    deadlineIdx: index("savings_goals_deadline_idx").on(table.userId, table.deadline),
    targetAmountPositiveCheck: check("savings_goals_target_amount_positive_check", sql`${table.targetAmount} > 0`),
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
    origin: expenseOriginEnum("origin").notNull().default("MANUAL"),
    recurringExpenseId: uuid("recurring_expense_id").references(() => recurringExpenses.id, { onDelete: "set null" }),
    savingsGoalId: uuid("savings_goal_id").references(() => savingsGoals.id, { onDelete: "set null" }),
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
    savingsGoalIdx: index("expenses_savings_goal_id_idx").on(table.savingsGoalId),
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
    mode: recurringExpenseModeEnum("mode").notNull().default("AUTOMATIC"),
    priority: reminderPriorityEnum("priority").notNull().default("MEDIUM"),
    category: text("category"),
    frequency: frequencyEnum("frequency").notNull().default("monthly"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    notifyDaysBefore: integer("notify_days_before").notNull().default(0),
    payableDayOfMonth: integer("payable_day_of_month"),
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
    notifyDaysBeforeCheck: check(
      "recurring_expenses_notify_days_before_check",
      sql`${table.notifyDaysBefore} >= 0 AND ${table.notifyDaysBefore} <= 15`
    ),
    payableDayOfMonthCheck: check(
      "recurring_expenses_payable_day_of_month_check",
      sql`${table.payableDayOfMonth} IS NULL OR (${table.payableDayOfMonth} >= 1 AND ${table.payableDayOfMonth} <= 31)`
    ),
    dateOrderCheck: check(
      "recurring_expenses_date_order_check",
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
  })
);

export const recurringExpenseOccurrences = pgTable(
  "recurring_expense_occurrences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    recurringExpenseId: uuid("recurring_expense_id")
      .notNull()
      .references(() => recurringExpenses.id, { onDelete: "cascade" }),
    dueDate: date("due_date").notNull(),
    status: recurringExpenseOccurrenceStatusEnum("status").notNull().default("PENDING"),
    expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("recurring_expense_occurrences_user_id_idx").on(table.userId),
    dueDateIdx: index("recurring_expense_occurrences_due_date_idx").on(table.userId, table.dueDate),
    statusIdx: index("recurring_expense_occurrences_status_idx").on(table.userId, table.status),
    recurringExpenseIdx: index("recurring_expense_occurrences_recurring_expense_id_idx").on(table.recurringExpenseId),
    recurringExpenseDueDateUniqueIdx: uniqueIndex("recurring_expense_occurrences_unique_idx").on(
      table.recurringExpenseId,
      table.dueDate
    ),
  })
);

export const savingsContributions = pgTable(
  "savings_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    savingsGoalId: uuid("savings_goal_id")
      .notNull()
      .references(() => savingsGoals.id, { onDelete: "cascade" }),
    expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "set null" }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    contributionDate: date("contribution_date").notNull(),
    description: text("description"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("savings_contributions_user_id_idx").on(table.userId),
    savingsGoalIdx: index("savings_contributions_savings_goal_id_idx").on(table.savingsGoalId),
    dateIdx: index("savings_contributions_date_idx").on(table.userId, table.contributionDate),
    expenseIdx: index("savings_contributions_expense_id_idx").on(table.expenseId),
    voidedAtIdx: index("savings_contributions_voided_at_idx").on(table.voidedAt),
    amountPositiveCheck: check("savings_contributions_amount_positive_check", sql`${table.amount} > 0`),
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

export const signatureRequests = pgTable(
  "signature_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    message: text("message"),
    recipientName: text("recipient_name"),
    recipientEmail: text("recipient_email").notNull(),
    recipientTaxId: text("recipient_tax_id"),
    status: signatureRequestStatusEnum("status").notNull().default("DRAFT"),
    tokenHash: text("token_hash").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("signature_requests_user_id_idx").on(table.userId),
    clientIdx: index("signature_requests_client_id_idx").on(table.clientId),
    caseIdx: index("signature_requests_case_id_idx").on(table.caseId),
    statusIdx: index("signature_requests_status_idx").on(table.userId, table.status),
    recipientEmailIdx: index("signature_requests_recipient_email_idx").on(table.recipientEmail),
    tokenHashIdx: uniqueIndex("signature_requests_token_hash_idx").on(table.tokenHash),
  })
);

export const signatureDocuments = pgTable(
  "signature_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    signatureRequestId: uuid("signature_request_id")
      .notNull()
      .references(() => signatureRequests.id, { onDelete: "cascade" }),
    originalFileName: text("original_file_name").notNull(),
    originalStoragePath: text("original_storage_path").notNull(),
    signedStoragePath: text("signed_storage_path"),
    originalSha256: text("original_sha256").notNull(),
    signedSha256: text("signed_sha256"),
    pageNumber: integer("page_number").notNull().default(1),
    placementX: decimal("placement_x", { precision: 10, scale: 4 }).notNull(),
    placementY: decimal("placement_y", { precision: 10, scale: 4 }).notNull(),
    placementWidth: decimal("placement_width", { precision: 10, scale: 4 }).notNull(),
    placementHeight: decimal("placement_height", { precision: 10, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("signature_documents_user_id_idx").on(table.userId),
    requestIdx: uniqueIndex("signature_documents_request_id_idx").on(table.signatureRequestId),
  })
);

export const clientSavedSignatures = pgTable(
  "client_saved_signatures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    signerName: text("signer_name"),
    signerEmail: text("signer_email"),
    storagePath: text("storage_path").notNull(),
    sha256: text("sha256").notNull(),
    consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("client_saved_signatures_user_id_idx").on(table.userId),
    clientIdx: uniqueIndex("client_saved_signatures_client_id_idx").on(table.clientId),
  })
);

export const signatureEvents = pgTable(
  "signature_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    signatureRequestId: uuid("signature_request_id")
      .notNull()
      .references(() => signatureRequests.id, { onDelete: "cascade" }),
    type: signatureEventTypeEnum("type").notNull(),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("signature_events_user_id_idx").on(table.userId),
    requestIdx: index("signature_events_request_id_idx").on(table.signatureRequestId),
    createdAtIdx: index("signature_events_created_at_idx").on(table.signatureRequestId, table.createdAt),
  })
);

export const clientsRelations = relations(clients, ({ many, one }) => ({
  cases: many(cases),
  reminders: many(reminders),
  signatureRequests: many(signatureRequests),
  savedSignature: one(clientSavedSignatures, {
    fields: [clients.id],
    references: [clientSavedSignatures.clientId],
  }),
}));

export const casesRelations = relations(cases, ({ many, one }) => ({
  client: one(clients, { fields: [cases.clientId], references: [clients.id] }),
  charges: many(charges),
  reminders: many(reminders),
  signatureRequests: many(signatureRequests),
}));

export const chargesRelations = relations(charges, ({ many, one }) => ({
  case: one(cases, { fields: [charges.caseId], references: [cases.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  charge: one(charges, { fields: [payments.chargeId], references: [charges.id] }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  recurringExpense: one(recurringExpenses, { fields: [expenses.recurringExpenseId], references: [recurringExpenses.id] }),
  savingsGoal: one(savingsGoals, { fields: [expenses.savingsGoalId], references: [savingsGoals.id] }),
}));

export const savingsGoalsRelations = relations(savingsGoals, ({ many }) => ({
  contributions: many(savingsContributions),
}));

export const savingsContributionsRelations = relations(savingsContributions, ({ one }) => ({
  goal: one(savingsGoals, { fields: [savingsContributions.savingsGoalId], references: [savingsGoals.id] }),
  expense: one(expenses, { fields: [savingsContributions.expenseId], references: [expenses.id] }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  case: one(cases, { fields: [reminders.caseId], references: [cases.id] }),
  client: one(clients, { fields: [reminders.clientId], references: [clients.id] }),
}));

export const signatureRequestsRelations = relations(signatureRequests, ({ many, one }) => ({
  client: one(clients, { fields: [signatureRequests.clientId], references: [clients.id] }),
  case: one(cases, { fields: [signatureRequests.caseId], references: [cases.id] }),
  document: one(signatureDocuments, {
    fields: [signatureRequests.id],
    references: [signatureDocuments.signatureRequestId],
  }),
  events: many(signatureEvents),
}));

export const signatureDocumentsRelations = relations(signatureDocuments, ({ one }) => ({
  request: one(signatureRequests, {
    fields: [signatureDocuments.signatureRequestId],
    references: [signatureRequests.id],
  }),
}));

export const clientSavedSignaturesRelations = relations(clientSavedSignatures, ({ one }) => ({
  client: one(clients, { fields: [clientSavedSignatures.clientId], references: [clients.id] }),
}));

export const signatureEventsRelations = relations(signatureEvents, ({ one }) => ({
  request: one(signatureRequests, {
    fields: [signatureEvents.signatureRequestId],
    references: [signatureRequests.id],
  }),
}));
