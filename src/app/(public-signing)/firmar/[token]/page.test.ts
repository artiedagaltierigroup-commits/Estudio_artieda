import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

describe("public signing page", () => {
  it("does not track link openings during server render", () => {
    const source = readFileSync(join(process.cwd(), "src/app/(public-signing)/firmar/[token]/page.tsx"), "utf8");

    expect(source).not.toContain("trackPublicSignatureEvent");
    expect(source).toContain("PublicSignatureOpenTracker");
  });
});
