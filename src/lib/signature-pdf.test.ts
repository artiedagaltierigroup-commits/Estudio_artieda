import { describe, expect, it } from "vitest";
import { toPdfPlacement } from "./signature-pdf";

describe("signature pdf placement", () => {
  it("converts normalized placement into PDF points", () => {
    expect(
      toPdfPlacement({
        pageWidth: 600,
        pageHeight: 800,
        x: 0.1,
        y: 0.2,
        width: 0.5,
        height: 0.1,
      })
    ).toEqual({
      x: 60,
      y: 560,
      width: 300,
      height: 80,
    });
  });
});
