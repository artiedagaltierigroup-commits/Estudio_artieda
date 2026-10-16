import { afterEach, describe, expect, it, vi } from "vitest";
import { listRecurringDueDates } from "./recurring-expense-occurrences";
import { deriveChargeStatus } from "./utils";

afterEach(() => vi.useRealTimers());

describe("calendario financiero de Argentina", () => {
  it("conserva el día 31 después de febrero", () => {
    expect(listRecurringDueDates({ active: true, mode: "AUTOMATIC", frequency: "monthly", startDate: "2026-01-31", endDate: null, payableDayOfMonth: null }, { from: "2026-01-01", to: "2026-04-30" })).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });
  it("conserva el 29 de febrero al volver a un año bisiesto", () => {
    expect(listRecurringDueDates({ active: true, mode: "AUTOMATIC", frequency: "yearly", startDate: "2024-02-29", endDate: null, payableDayOfMonth: null }, { from: "2027-01-01", to: "2028-12-31" })).toEqual(["2027-02-28", "2028-02-29"]);
  });
  it.each(["2026-10-15T00:30:00Z", "2026-10-15T21:00:00Z", "2026-10-16T02:59:59Z"])("no vence antes de terminar el día argentino: %s", (now) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(now));
    expect(deriveChargeStatus("100", "0", "2026-10-15")).toBe("PENDING");
  });
  it("vence al empezar el siguiente día argentino", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-16T03:00:00Z"));
    expect(deriveChargeStatus("100", "0", "2026-10-15")).toBe("OVERDUE");
  });
});
