import { describe, expect, it } from "vitest";
import { isPublicRoutePath } from "./public-routes";

describe("public route paths", () => {
  it("allows public signature links without authentication", () => {
    expect(isPublicRoutePath("/firmar/token")).toBe(true);
    expect(isPublicRoutePath("/api/signatures/email-open/token")).toBe(true);
    expect(isPublicRoutePath("/api/signatures/final-copy/token")).toBe(true);
  });

  it("keeps authenticated signature artifact routes private", () => {
    expect(isPublicRoutePath("/api/signatures/request-id/signed-document")).toBe(false);
    expect(isPublicRoutePath("/firmas/request-id")).toBe(false);
  });
});
