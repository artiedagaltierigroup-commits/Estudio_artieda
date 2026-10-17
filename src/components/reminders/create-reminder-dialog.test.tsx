import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CreateReminderDialog, CreateReminderForm } from "./create-reminder-dialog";

const references = {
  assistants: [{ userId: "staff", displayName: "Briza" }],
  clients: [{ id: "client", name: "Cliente Uno" }],
  cases: [{ id: "case", title: "Caso Uno", clientName: "Cliente Uno" }],
};

describe("task creation dialog", () => {
  it("keeps every task creation field inside the form", () => {
    const html = renderToStaticMarkup(
      <CreateReminderForm
        action={vi.fn()}
        role="ADMIN"
        displayName="Victoria"
        references={references}
      />
    );

    for (const field of ["title", "reminderDate", "assigneeUserId", "priority", "clientId", "caseId", "description"]) {
      expect(html).toContain(`name="${field}"`);
    }
    expect(html).toContain("Solo para Victoria");
    expect(html).toContain("Briza");
    expect(html).toContain("Cancelar");
    expect(html).toContain("Guardar tarea");
  });

  it("renders the header trigger and accessible dialog structure", () => {
    const html = renderToStaticMarkup(
      <CreateReminderDialog
        action={vi.fn()}
        role="COLLABORATOR"
        displayName="Briza"
        references={references}
      />
    );
    const source = readFileSync(new URL("./create-reminder-dialog.tsx", import.meta.url), "utf8");

    expect(html).toContain("Nueva tarea");
    expect(source).toContain("DialogContent");
    expect(source).toContain("DialogTitle");
    expect(source).toContain("DialogDescription");
  });
});
