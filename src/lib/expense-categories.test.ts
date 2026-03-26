import { describe, expect, it } from "vitest";
import { buildExpenseCategoryOptions, expenseCategories } from "./expense-categories";

describe("expense categories", () => {
  it("returns the shared base catalog", () => {
    expect(expenseCategories).toContain("Impuestos");
    expect(expenseCategories).toContain("Transporte");
    expect(expenseCategories).toContain("Publicidad y marketing");
    expect(expenseCategories).toContain("Ropa e imagen profesional");
    expect(expenseCategories).toContain("Equipamiento");
    expect(expenseCategories).toContain("Salud y bienestar");
  });

  it("keeps an unknown existing category visible when editing", () => {
    const options = buildExpenseCategoryOptions("Mascotas");

    expect(options[0]).toBe("Mascotas");
    expect(options).toContain("Varios");
  });

  it("does not duplicate categories that already exist in the shared catalog", () => {
    expect(buildExpenseCategoryOptions("Impuestos")).toEqual(expenseCategories);
  });
});
