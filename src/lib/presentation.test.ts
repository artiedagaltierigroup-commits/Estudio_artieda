import { describe, expect, it } from "vitest";
import {
  getCaseStatusTone,
  getChargeStatusTone,
  getNameInitials,
  getToneStyles,
} from "./presentation";

describe("presentation helpers", () => {
  it("maps case statuses to the expected visual tones", () => {
    expect(getCaseStatusTone("ACTIVE")).toBe("sage");
    expect(getCaseStatusTone("SUSPENDED")).toBe("amber");
    expect(getCaseStatusTone("CLOSED")).toBe("slate");
    expect(getCaseStatusTone("UNKNOWN")).toBe("slate");
  });

  it("maps charge statuses to the expected visual tones", () => {
    expect(getChargeStatusTone("PENDING")).toBe("amber");
    expect(getChargeStatusTone("PARTIAL")).toBe("lilac");
    expect(getChargeStatusTone("PAID")).toBe("sage");
    expect(getChargeStatusTone("OVERDUE")).toBe("danger");
    expect(getChargeStatusTone("CANCELLED")).toBe("slate");
    expect(getChargeStatusTone("WHATEVER")).toBe("amber");
  });

  it("builds predictable initials for client avatars", () => {
    expect(getNameInitials("Maria Jose Perez")).toBe("MJ");
    expect(getNameInitials("Estudio")).toBe("E");
    expect(getNameInitials("   ")).toBe("CL");
  });

  it("exposes chip classes for each tone", () => {
    expect(getToneStyles("rose").chip).toContain("bg-[#f8e8ee]");
    expect(getToneStyles("danger").dot).toContain("#d96c6c");
  });
});
