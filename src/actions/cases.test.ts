import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actionSource = readFileSync(new URL("./cases.ts", import.meta.url), "utf8");
const deleteCaseSource = actionSource.slice(actionSource.indexOf("export async function deleteCase"));

describe("deleteCase action", () => {
  it("guards deletion by case id and authenticated user id", () => {
    expect(deleteCaseSource).toContain("export async function deleteCase");
    expect(deleteCaseSource).toContain("eq(cases.id, id)");
    expect(deleteCaseSource).toContain("eq(cases.userId, userId)");
  });

  it("logs the deleted case before removing it", () => {
    expect(deleteCaseSource.indexOf("await logActivity")).toBeGreaterThan(-1);
    expect(deleteCaseSource.indexOf("await logActivity")).toBeLessThan(deleteCaseSource.indexOf("await db.delete(cases)"));
    expect(deleteCaseSource).toContain('action: "deleted"');
    expect(deleteCaseSource).toContain("previousValue: existing");
  });

  it("revalidates the affected operational pages", () => {
    expect(deleteCaseSource).toContain('revalidatePath("/casos")');
    expect(deleteCaseSource).toContain("revalidatePath(`/clientes/${existing.clientId}`)");
    expect(deleteCaseSource).toContain('revalidatePath("/cobros")');
    expect(deleteCaseSource).toContain('revalidatePath("/")');
    expect(deleteCaseSource).toContain('revalidatePath("/estadisticas")');
  });
});
