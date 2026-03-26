import { describe, expect, it } from "vitest";
import { formatStatisticsAxisValue, getHorizontalBarChartHeight } from "./statistics-presentation";

describe("getHorizontalBarChartHeight", () => {
  it("keeps a minimum height for short rankings", () => {
    expect(getHorizontalBarChartHeight(1)).toBe(220);
  });

  it("grows with the number of rows", () => {
    expect(getHorizontalBarChartHeight(8)).toBe(384);
  });
});

describe("formatStatisticsAxisValue", () => {
  it("shows small values without collapsing them to zero thousands", () => {
    expect(formatStatisticsAxisValue(700)).toBe("$700");
  });

  it("keeps larger values with local thousand separators", () => {
    expect(formatStatisticsAxisValue(4200)).toBe("$4.200");
  });

  it("preserves the sign for negative values", () => {
    expect(formatStatisticsAxisValue(-4200)).toBe("$-4.200");
  });
});
