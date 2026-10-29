import { describe, expect, it } from "vitest";
import { canAccessReminder, resolveReminderAssignee } from "./reminder-assignment";

const victoria = {
  actorUserId: "victoria-id",
  ownerUserId: "victoria-id",
  role: "ADMIN" as const,
};

const briza = {
  actorUserId: "briza-id",
  ownerUserId: "victoria-id",
  role: "COLLABORATOR" as const,
};

describe("reminder assignment", () => {
  it("lets Victoria keep a task private", () => {
    expect(resolveReminderAssignee(victoria, null, ["briza-id"])).toBeNull();
  });

  it("lets Victoria assign a task to an enabled assistant", () => {
    expect(resolveReminderAssignee(victoria, "briza-id", ["briza-id"])).toBe("briza-id");
  });

  it("rejects an unknown or disabled assistant", () => {
    expect(() => resolveReminderAssignee(victoria, "unknown-id", ["briza-id"])).toThrow("INVALID_ASSIGNEE");
  });

  it("automatically assigns Brisa's task to Brisa", () => {
    expect(resolveReminderAssignee(briza, undefined, ["briza-id"])).toBe("briza-id");
  });

  it("lets Brisa assign a task to herself or Victoria", () => {
    expect(resolveReminderAssignee(briza, "briza-id", ["briza-id"])).toBe("briza-id");
    expect(resolveReminderAssignee(briza, null, ["briza-id"])).toBeNull();
    expect(resolveReminderAssignee(briza, "victoria-id", ["briza-id"])).toBeNull();
  });

  it("rejects Brisa assigning a task to another assistant or when she is disabled", () => {
    expect(() => resolveReminderAssignee(briza, "other-id", ["briza-id", "other-id"])).toThrow("ASSIGNMENT_FORBIDDEN");
    expect(() => resolveReminderAssignee(briza, null, [])).toThrow("INVALID_ASSIGNEE");
  });

  it("lets Victoria see every task in her office", () => {
    expect(canAccessReminder(victoria, { userId: "victoria-id", createdByUserId: "victoria-id", assigneeUserId: null })).toBe(true);
    expect(canAccessReminder(victoria, { userId: "victoria-id", createdByUserId: "briza-id", assigneeUserId: "briza-id" })).toBe(true);
  });

  it("lets Brisa see tasks she created or Victoria assigned to her", () => {
    expect(canAccessReminder(briza, { userId: "victoria-id", createdByUserId: "briza-id", assigneeUserId: "briza-id" })).toBe(true);
    expect(canAccessReminder(briza, { userId: "victoria-id", createdByUserId: "briza-id", assigneeUserId: null })).toBe(true);
    expect(canAccessReminder(briza, { userId: "victoria-id", createdByUserId: "victoria-id", assigneeUserId: null })).toBe(false);
    expect(canAccessReminder(briza, { userId: "victoria-id", createdByUserId: "victoria-id", assigneeUserId: "briza-id" })).toBe(true);
    expect(canAccessReminder(briza, { userId: "victoria-id", createdByUserId: "other-id", assigneeUserId: "other-id" })).toBe(false);
  });

  it("never crosses office boundaries", () => {
    expect(canAccessReminder(victoria, { userId: "another-office", createdByUserId: "victoria-id", assigneeUserId: null })).toBe(false);
    expect(canAccessReminder(briza, { userId: "another-office", createdByUserId: "briza-id", assigneeUserId: "briza-id" })).toBe(false);
  });
});
