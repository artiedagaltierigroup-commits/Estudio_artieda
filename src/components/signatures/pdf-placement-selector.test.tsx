import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("react-pdf", () => ({
  pdfjs: { GlobalWorkerOptions: {} },
  Document: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
  Page: ({ pageNumber }: { pageNumber: number }) => createElement("div", { "data-page": pageNumber }),
}));

it("shows saved signature positions on their PDF page without editing controls", async () => {
  const { PdfPlacementSelector } = await import("./pdf-placement-selector");
  const html = renderToStaticMarkup(createElement(PdfPlacementSelector, {
    previewUrl: "https://example.test/document.pdf",
    readOnly: true,
    recipients: [
      { id: "alice", label: "Alice" },
      { id: "bob", label: "Bob" },
    ],
    initialPlacements: [
      { id: "one", recipientId: "alice", pageNumber: 1, x: 0.1, y: 0.2, width: 0.3, height: 0.1 },
      { id: "two", recipientId: "bob", pageNumber: 2, x: 0.4, y: 0.5, width: 0.3, height: 0.1 },
    ],
  }));

  expect(html).toContain("Alice #1");
  expect(html).not.toContain("Bob #1");
  expect(html).toContain("left:10%");
  expect(html).not.toContain("Destinatario activo");
  expect(html).not.toContain('type="hidden"');
  expect(html).not.toContain("Seleccionar espacio");
}, 30_000);
