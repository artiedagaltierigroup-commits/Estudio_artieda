"use server";

import { db } from "@/db";
import { filterClientsByQuery } from "@/lib/client-insights";
import {
  operationalCaseColumns, operationalClientColumns, operationalReminderColumns,
  projectOperationalCase, projectOperationalClient, projectOperationalReminder,
} from "@/lib/operational-projections";
import { getWorkspaceAccess } from "@/lib/workspace-access";

export async function getOperationalClients(query?: string) {
  const { ownerUserId } = await getWorkspaceAccess();
  const rows = await db.query.clients.findMany({
    columns: operationalClientColumns,
    where: (row, { eq }) => eq(row.userId, ownerUserId),
    orderBy: (row, { asc }) => [asc(row.name)],
    with: {
      cases: {
        columns: operationalCaseColumns,
        where: (row, { eq }) => eq(row.userId, ownerUserId),
        orderBy: (row, { desc }) => [desc(row.updatedAt)],
      },
      reminders: {
        columns: operationalReminderColumns,
        where: (row, { eq }) => eq(row.userId, ownerUserId),
        orderBy: (row, { asc }) => [asc(row.reminderDate)],
      },
    },
  });
  return filterClientsByQuery(rows.map(row => ({
    ...projectOperationalClient(row),
    cases: row.cases.map(projectOperationalCase),
    reminders: row.reminders.map(projectOperationalReminder),
  })), query);
}

export async function getOperationalClient(id: string) {
  const { ownerUserId } = await getWorkspaceAccess();
  const row = await db.query.clients.findFirst({
    columns: operationalClientColumns,
    where: (row, { and, eq }) => and(eq(row.id, id), eq(row.userId, ownerUserId)),
    with: {
      cases: {
        columns: operationalCaseColumns,
        where: (row, { eq }) => eq(row.userId, ownerUserId),
        orderBy: (row, { desc }) => [desc(row.updatedAt)],
      },
      reminders: {
        columns: operationalReminderColumns,
        where: (row, { eq }) => eq(row.userId, ownerUserId),
        orderBy: (row, { asc }) => [asc(row.reminderDate)],
      },
    },
  });
  if (!row) return null;
  return {
    ...projectOperationalClient(row),
    cases: row.cases.map(projectOperationalCase),
    reminders: row.reminders.map(projectOperationalReminder),
  };
}

export async function getOperationalCases(filters?: { query?: string; status?: string }) {
  const { ownerUserId } = await getWorkspaceAccess();
  const rows = await db.query.cases.findMany({
    columns: operationalCaseColumns,
    where: (row, { eq }) => eq(row.userId, ownerUserId),
    orderBy: (row, { desc }) => [desc(row.updatedAt)],
    with: { client: { columns: operationalClientColumns } },
  });
  const query = filters?.query?.trim().toLowerCase();
  return rows.filter(row => row.client.userId === ownerUserId &&
    (!filters?.status || row.status === filters.status) &&
    (!query || row.title.toLowerCase().includes(query) || row.client.name.toLowerCase().includes(query))
  ).map(row => ({ ...projectOperationalCase(row), client: projectOperationalClient(row.client) }));
}

export async function getOperationalCase(id: string) {
  const { ownerUserId } = await getWorkspaceAccess();
  const row = await db.query.cases.findFirst({
    columns: operationalCaseColumns,
    where: (row, { and, eq }) => and(eq(row.id, id), eq(row.userId, ownerUserId)),
    with: {
      client: { columns: operationalClientColumns },
      reminders: {
        columns: operationalReminderColumns,
        where: (row, { eq }) => eq(row.userId, ownerUserId),
        orderBy: (row, { asc }) => [asc(row.reminderDate)],
      },
    },
  });
  if (!row || row.client.userId !== ownerUserId) return null;
  return {
    ...projectOperationalCase(row),
    client: projectOperationalClient(row.client),
    reminders: row.reminders.map(projectOperationalReminder),
  };
}
