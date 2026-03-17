import { describe, expect, it } from "vitest";
import { normalizeReminderMutationInput } from "./form-normalizers";

describe("normalizeReminderMutationInput", () => {
  it("converts empty relation fields to null and reminderDate to Date", () => {
    const normalized = normalizeReminderMutationInput({
      caseId: "",
      clientId: "",
      title: "Llamar al cliente",
      description: "Confirmar documentacion",
      reminderDate: "2026-03-17T09:30",
      priority: "HIGH",
    });

    expect(normalized.caseId).toBeNull();
    expect(normalized.clientId).toBeNull();
    expect(normalized.reminderDate).toBeInstanceOf(Date);
    expect(normalized.priority).toBe("HIGH");
  });

  it("keeps provided related ids", () => {
    const normalized = normalizeReminderMutationInput({
      caseId: "6f0fd944-ae44-4c97-8542-aa55f702fe6d",
      clientId: "fa5efb28-22fd-486b-ae7b-f0a4e8238ce2",
      title: "Audiencia",
      reminderDate: "2026-03-18T10:00",
      priority: "MEDIUM",
    });

    expect(normalized.caseId).toBe("6f0fd944-ae44-4c97-8542-aa55f702fe6d");
    expect(normalized.clientId).toBe("fa5efb28-22fd-486b-ae7b-f0a4e8238ce2");
  });
});
