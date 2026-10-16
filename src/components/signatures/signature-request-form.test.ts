import { expect, it } from "vitest";

it("loads the new-signature form on the server without browser PDF globals", async () => {
  expect(typeof globalThis.DOMMatrix).toBe("undefined");
  const form = await import("./signature-request-form");
  expect(form.SignatureRequestForm).toBeTypeOf("function");
}, 30_000);
