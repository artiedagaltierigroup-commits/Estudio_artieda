import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const submitButtonUrl = new URL("./submit-button.tsx", import.meta.url);
const submitButtonSource = existsSync(submitButtonUrl) ? readFileSync(submitButtonUrl, "utf8") : "";

const mutationFormSources = [
  "../expenses/expense-form.tsx",
  "../charges/charge-form.tsx",
  "../charges/payment-form.tsx",
  "../clients/client-form.tsx",
  "../cases/case-form.tsx",
  "../expenses/recurring-expense-form.tsx",
  "../savings/savings-goal-form.tsx",
  "../savings/savings-contribution-form.tsx",
  "../../app/(dashboard)/recordatorios/page.tsx",
  "../../app/(dashboard)/cobros/[id]/page.tsx",
  "../../app/(dashboard)/gastos/[id]/page.tsx",
  "../../app/(dashboard)/ahorros/page.tsx",
  "../dashboard/recurring-payables-checklist.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

describe("submit button double-submit protection", () => {
  it("disables itself while the surrounding form action is pending", () => {
    expect(submitButtonSource).toContain("useFormStatus");
    expect(submitButtonSource).toContain("disabled={isDisabled}");
    expect(submitButtonSource).toContain('aria-disabled={isDisabled ? "true" : undefined}');
    expect(submitButtonSource).toContain('Guardando...');
  });

  it("is used by mutation forms instead of raw submit buttons", () => {
    for (const source of mutationFormSources) {
      expect(source).toContain("SubmitButton");
      expect(source).not.toContain('<Button type="submit"');
    }
  });
});
