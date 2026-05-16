import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actionSource = readFileSync(new URL("./recurring-expense-occurrences.ts", import.meta.url), "utf8");
const markPaidSource = actionSource.slice(
  actionSource.indexOf("export async function markRecurringOccurrencePaid"),
  actionSource.indexOf("export async function reopenRecurringOccurrence")
);

describe("markRecurringOccurrencePaid duplicate protection", () => {
  it("locks the occurrence row before creating the payable expense", () => {
    expect(markPaidSource).toContain("db.transaction");
    expect(markPaidSource).toContain('.for("update")');
    expect(markPaidSource.indexOf('.for("update")')).toBeLessThan(
      markPaidSource.indexOf(".insert(expenses)")
    );
  });
});
