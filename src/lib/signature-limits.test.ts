import { expect, it } from "vitest";
import { getSignatureCanvasScale, MAX_SIGNATURE_IMAGE_DIMENSION } from "./signature-limits";

it("keeps normal signature canvas resolution", () => {
  expect(getSignatureCanvasScale(600, 240, 2)).toBe(2);
});
it("caps high-density screens to the same image dimensions accepted by the server", () => {
  const width = 900; const height = 360;
  const scale = getSignatureCanvasScale(width, height, 4);
  expect(width * scale).toBeLessThanOrEqual(MAX_SIGNATURE_IMAGE_DIMENSION);
  expect(height * scale).toBeLessThanOrEqual(MAX_SIGNATURE_IMAGE_DIMENSION);
});
