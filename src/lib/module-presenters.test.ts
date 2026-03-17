import { describe, expect, it } from "vitest";
import {
  getActivityActionLabel,
  getActivityEntityLabel,
  getCalendarEventLabel,
  getCalendarEventTone,
  getReminderPriorityTone,
} from "./module-presenters";

describe("module presenters", () => {
  it("maps reminder priorities to visual tones", () => {
    expect(getReminderPriorityTone("HIGH")).toBe("danger");
    expect(getReminderPriorityTone("MEDIUM")).toBe("amber");
    expect(getReminderPriorityTone("LOW")).toBe("slate");
    expect(getReminderPriorityTone("UNKNOWN")).toBe("slate");
  });

  it("maps calendar event types to labels and tones", () => {
    expect(getCalendarEventLabel("charge")).toBe("Cobro");
    expect(getCalendarEventTone("charge")).toBe("lilac");
    expect(getCalendarEventLabel("reminder")).toBe("Recordatorio");
    expect(getCalendarEventTone("expense")).toBe("danger");
  });

  it("maps activity labels with fallback", () => {
    expect(getActivityActionLabel("created")).toBe("Creado");
    expect(getActivityEntityLabel("charge")).toBe("Cobro");
    expect(getActivityActionLabel("custom")).toBe("custom");
    expect(getActivityEntityLabel("custom")).toBe("custom");
  });
});
