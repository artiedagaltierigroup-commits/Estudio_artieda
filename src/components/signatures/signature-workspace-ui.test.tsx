import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const state = vi.hoisted(() => ({
  role: "COLLABORATOR" as "COLLABORATOR" | "ADMIN",
  cancel: vi.fn(async () => ({ success: true })),
  remove: vi.fn(async () => ({ success: true })),
  submit: undefined as undefined | ((state: object, formData: FormData) => Promise<{ error?: string | null }>),
}));
vi.mock("@/actions/signatures", () => ({
  createSignatureDraft: async () => ({ success: true, signatureRequestId: "synthetic-request" }),
  getSignatureFormOptions: async () => ({ clients: [], cases: [] }),
  uploadSignatureDocument: async () => ({ error: "PDF invalido" }),
  cancelSignatureRequest: state.cancel,
  deleteSignatureRequest: state.remove,
  resendSignatureRequest: vi.fn(), sendSignatureRequest: vi.fn(), updateSignaturePlacement: vi.fn(),
}));
vi.mock("@/lib/workspace-access", () => ({ getWorkspaceAccess: async () => ({ role: state.role }) }));
vi.mock("@/components/signatures/signature-action-form", () => ({ SignatureActionForm: ({ children }: { children: ReactNode }) => <button>{children}</button> }));
vi.mock("@/components/signatures/signature-request-form", () => ({ SignatureRequestForm: ({ action }: { action: typeof state.submit }) => { state.submit = action; return <div>Formulario</div>; } }));

import { SignatureRequestActions } from "./signature-request-actions";
import NuevaFirmaPage from "../../app/(dashboard)/firmas/nueva/page";

describe("signature screens respect collaborator permissions", () => {
  beforeEach(() => { state.role = "COLLABORATOR"; state.cancel.mockClear(); state.remove.mockClear(); });

  it("hides permanent deletion while retaining send and cancel", () => {
    const html = renderToStaticMarkup(<SignatureRequestActions requestId="test" status="READY" canDelete={false} />);
    expect(html).not.toContain("Eliminar solicitud");
    expect(html).toContain("Enviar");
    expect(html).toContain("Cancelar");
  });

  it("keeps administrator deletion available", () => {
    const html = renderToStaticMarkup(<SignatureRequestActions requestId="test" status="READY" canDelete />);
    expect(html).toContain("Eliminar solicitud");
  });

  it("cancels a collaborator's incomplete request when upload fails without attempting forbidden deletion", async () => {
    renderToStaticMarkup(await NuevaFirmaPage({}));
    expect(await state.submit!({}, new FormData())).toEqual({ error: "No se pudo guardar el PDF: PDF invalido" });
    expect(state.cancel).toHaveBeenCalledWith("synthetic-request");
    expect(state.remove).not.toHaveBeenCalled();
  });

  it("preserves administrator upload failure cleanup", async () => {
    state.role = "ADMIN";
    renderToStaticMarkup(await NuevaFirmaPage({}));
    expect(await state.submit!({}, new FormData())).toHaveProperty("error");
    expect(state.remove).toHaveBeenCalledWith("synthetic-request");
    expect(state.cancel).not.toHaveBeenCalled();
  });
});
