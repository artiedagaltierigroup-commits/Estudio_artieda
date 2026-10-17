import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("./0016_correct_brisa_name.sql", import.meta.url), "utf8");

describe("Brisa display name correction", () => {
  it("corrects exactly the intended active collaborator account", () => {
    expect(migration).toContain("legalesartieda@gmail.com");
    expect(migration).toMatch(/SET display_name = 'Brisa'/);
    expect(migration).toMatch(/member\.display_name = 'Briza'/);
    expect(migration).toMatch(/member\.role = 'COLLABORATOR'/);
    expect(migration).toMatch(/member\.enabled = true/);
    expect(migration).toContain("updated_rows <> 1");
    expect(migration).toContain("RAISE EXCEPTION");
  });
});
