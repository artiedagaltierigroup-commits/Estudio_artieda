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

  it("lets the two cron handlers enforce their own bearer authentication", () => {
    expect(isPublicRoutePath("/api/cron/signatures")).toBe(true);
    expect(isPublicRoutePath("/api/cron/recurring-expenses")).toBe(true);
    expect(isPublicRoutePath("/api/cron/unknown")).toBe(false);
    expect(isPublicRoutePath("/api/cron/signatures/other")).toBe(false);
  });
});
