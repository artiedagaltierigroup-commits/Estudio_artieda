import { describe, expect, it } from "vitest";
import { decodeSignaturePng } from "./signature-image";
import { MAX_SIGNATURE_IMAGE_BYTES } from "./signature-limits";

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l6D3VwAAAABJRU5ErkJggg==";
describe("signature PNG validation", () => {
  it("decodes a real PNG with the PDF renderer", async () => {
    expect(await decodeSignaturePng(`data:image/png;base64,${png}`)).toEqual(Buffer.from(png, "base64"));
  });
  it.each(["", "data:image/jpeg;base64,AA==", "data:image/png;base64,???", "data:image/png;base64,aW52YWxpZA=="])("rejects malformed input %s", async (value) => {
    await expect(decodeSignaturePng(value)).rejects.toThrow();
  });
  it("rejects a payload above the encoded byte limit", async () => {
    await expect(decodeSignaturePng(`data:image/png;base64,${Buffer.alloc(MAX_SIGNATURE_IMAGE_BYTES + 1).toString("base64")}`)).rejects.toThrow();
  });
});
