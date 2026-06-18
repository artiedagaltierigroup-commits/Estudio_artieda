import { describe, expect, it } from "vitest";
import {
  SIGNATURE_PLACEMENT_COLORS,
  getSignaturePlacementColor,
  getSignaturePlacementVisualState,
} from "./signature-placement-colors";

describe("signature placement colors", () => {
  it("assigns stable colors by recipient index", () => {
    expect(getSignaturePlacementColor(0)).toEqual(SIGNATURE_PLACEMENT_COLORS[0]);
    expect(getSignaturePlacementColor(SIGNATURE_PLACEMENT_COLORS.length)).toEqual(SIGNATURE_PLACEMENT_COLORS[0]);
    expect(getSignaturePlacementColor(-1)).toEqual(SIGNATURE_PLACEMENT_COLORS[1]);
  });

  it("emphasizes active placements without changing the recipient color", () => {
    const active = getSignaturePlacementVisualState(1, true);
    const inactive = getSignaturePlacementVisualState(1, false);

    expect(active.color).toEqual(inactive.color);
    expect(active.opacity).toBe(1);
    expect(inactive.opacity).toBeLessThan(active.opacity);
    expect(active.borderWidth).toBeGreaterThan(inactive.borderWidth);
  });
});
