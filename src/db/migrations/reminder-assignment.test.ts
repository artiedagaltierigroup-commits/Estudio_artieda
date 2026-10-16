import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("./0015_reminder_assignment.sql", import.meta.url), "utf8");

describe("reminder assignment migration", () => {
  it("fails closed unless Artieda has exactly one active assistant and that person is Briza", () => {
    expect(migration).toContain("active_assistant_count <> 1");
    expect(migration).toContain("legalesartieda@gmail.com");
    expect(migration).toContain("RAISE EXCEPTION");
  });

  it("assigns only Victoria's existing reminders and preserves other offices as private", () => {
    expect(migration).toMatch(/UPDATE public\.reminders[\s\S]+SET assignee_user_id = briza_user_id[\s\S]+WHERE user_id = artieda_owner_id/);
    expect(migration).not.toMatch(/SET assignee_user_id = \([\s\S]+LIMIT 1/);
  });

  it("preserves every existing creator as the owner before adding foreign keys", () => {
    expect(migration).toMatch(/UPDATE reminders\s+SET created_by_user_id = user_id/);
  });
});
