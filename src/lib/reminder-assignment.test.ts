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

  it("automatically assigns Briza's task to Briza", () => {
    expect(resolveReminderAssignee(briza, undefined, ["briza-id"])).toBe("briza-id");
  });

  it("rejects an assignment field submitted by an assistant", () => {
    expect(() => resolveReminderAssignee(briza, null, ["briza-id"])).toThrow("ASSIGNMENT_FORBIDDEN");
    expect(() => resolveReminderAssignee(briza, "victoria-id", ["briza-id"])).toThrow("ASSIGNMENT_FORBIDDEN");
  });

  it("lets Victoria see every task in her office", () => {
    expect(canAccessReminder(victoria, { userId: "victoria-id", assigneeUserId: null })).toBe(true);
    expect(canAccessReminder(victoria, { userId: "victoria-id", assigneeUserId: "briza-id" })).toBe(true);
  });

  it("only lets Briza see tasks assigned to Briza", () => {
    expect(canAccessReminder(briza, { userId: "victoria-id", assigneeUserId: "briza-id" })).toBe(true);
    expect(canAccessReminder(briza, { userId: "victoria-id", assigneeUserId: null })).toBe(false);
    expect(canAccessReminder(briza, { userId: "victoria-id", assigneeUserId: "other-id" })).toBe(false);
  });

  it("never crosses office boundaries", () => {
    expect(canAccessReminder(victoria, { userId: "another-office", assigneeUserId: null })).toBe(false);
    expect(canAccessReminder(briza, { userId: "another-office", assigneeUserId: "briza-id" })).toBe(false);
  });
});
