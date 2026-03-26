const baseExpenseCategories = [
  "Oficina y papeleria",
  "Impuestos",
  "Servicios",
  "Software y suscripciones",
  "Internet y telefonia",
  "Transporte",
  "Comida y viaticos",
  "Publicidad y marketing",
  "Honorarios de terceros",
  "Tramites y gestiones",
  "Ropa e imagen profesional",
  "Reparaciones y mantenimiento",
  "Equipamiento",
  "Capacitacion",
  "Salud y bienestar",
  "Varios",
] as const;

export const expenseCategories = [...baseExpenseCategories];

export function buildExpenseCategoryOptions(currentValue?: string | null) {
  const normalizedCurrent = currentValue?.trim();

  if (!normalizedCurrent) return expenseCategories;
  if (expenseCategories.includes(normalizedCurrent as (typeof baseExpenseCategories)[number])) {
    return expenseCategories;
  }

  return [normalizedCurrent, ...expenseCategories];
}
