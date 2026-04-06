import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const headerSource = readFileSync(new URL("./header.tsx", import.meta.url), "utf8");

describe("header money visibility toggle", () => {
  it("wires the global money visibility hook into the header", () => {
    expect(headerSource).toContain("useMoneyVisibility");
    expect(headerSource).toContain("toggleMoneyVisibility");
  });

  it("renders eye icons and accessible labels for both visibility states", () => {
    expect(headerSource).toContain("EyeOff");
    expect(headerSource).toContain("Eye");
    expect(headerSource).toContain('aria-label={isMoneyHidden ? "Mostrar montos" : "Ocultar montos"}');
  });
});
