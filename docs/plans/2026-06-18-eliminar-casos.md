# Eliminar Casos Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agregar borrado definitivo de casos duplicados desde el detalle del caso.

**Architecture:** La accion de servidor `deleteCase` vivira en `src/actions/cases.ts`, validara propietario, registrara actividad y eliminara la fila de `cases`. La UI usara un componente cliente pequeno para confirmar la accion, llamar al server action y redirigir a `/casos`.

**Tech Stack:** Next.js App Router, React 19, server actions, Drizzle ORM, Supabase auth, Vitest, lucide-react.

---

### Task 1: Backend action and source-level test

**Files:**
- Modify: `src/actions/cases.ts`
- Create: `src/actions/cases.test.ts`

**Step 1: Write the failing test**

Create `src/actions/cases.test.ts` with source-level assertions matching existing action tests:

```ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/actions/cases.test.ts`

Expected: FAIL because `deleteCase` does not exist.

**Step 3: Implement the server action**

In `src/actions/cases.ts`, add after `updateCaseStatus`:

```ts
export async function deleteCase(id: string) {
  const userId = await getUserId();
  const existing = await db.query.cases.findFirst({
    where: (item, { and: andOperator, eq: eqOperator }) =>
      andOperator(eqOperator(item.id, id), eqOperator(item.userId, userId)),
  });
  if (!existing) return { error: "Caso no encontrado" };

  await logActivity({
    userId,
    entityType: "case",
    entityId: id,
    action: "deleted",
    previousValue: existing as Record<string, unknown>,
    note: "Caso eliminado definitivamente",
  });

  await db.delete(cases).where(and(eq(cases.id, id), eq(cases.userId, userId)));

  revalidatePath("/casos");
  revalidatePath(`/clientes/${existing.clientId}`);
  revalidatePath("/cobros");
  revalidatePath("/");
  revalidatePath("/estadisticas");
  return { success: true };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/actions/cases.test.ts`

Expected: PASS.

### Task 2: Client-side delete control

**Files:**
- Create: `src/components/cases/case-delete-button.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCase } from "@/actions/cases";
import { Button } from "@/components/ui/button";

interface CaseDeleteButtonProps {
  caseId: string;
  caseTitle: string;
}

export function CaseDeleteButton({ caseId, caseTitle }: CaseDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Eliminar "${caseTitle}"? Se eliminara este caso y sus cobros/pagos asociados. Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCase(caseId);
      if (result?.error) {
        window.alert(result.error);
        return;
      }
      router.push("/casos");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" onClick={handleDelete} disabled={isPending}>
      <Trash2 className="h-4 w-4" />
      {isPending ? "Eliminando..." : "Eliminar"}
    </Button>
  );
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`

Expected: PASS or only pre-existing errors unrelated to this change.

### Task 3: Wire the delete control into case detail

**Files:**
- Modify: `src/app/(dashboard)/casos/[id]/page.tsx`

**Step 1: Import the component**

Add:

```ts
import { CaseDeleteButton } from "@/components/cases/case-delete-button";
```

**Step 2: Render it in PageHeader actions**

Place it near "Editar caso", before "Nuevo cobro":

```tsx
<CaseDeleteButton caseId={caseData.id} caseTitle={caseData.title} />
```

**Step 3: Run focused checks**

Run:

```bash
npm test -- src/actions/cases.test.ts
npx tsc --noEmit
```

Expected: PASS.

### Task 4: Manual verification

**Files:**
- No code changes unless verification finds an issue.

**Step 1: Start the app**

Run: `npm run dev`

Expected: Next.js starts locally.

**Step 2: Verify UI flow**

Open a case detail page, confirm the "Eliminar" button is visible, cancel once to confirm no navigation happens, then delete a disposable duplicated case and verify the app redirects to `/casos`.

**Step 3: Verify data impact**

Confirm the deleted case no longer appears in `/casos`, the client detail, or `/cobros`.

### Task 5: Final commit

**Files:**
- Stage: `src/actions/cases.ts`
- Stage: `src/actions/cases.test.ts`
- Stage: `src/components/cases/case-delete-button.tsx`
- Stage: `src/app/(dashboard)/casos/[id]/page.tsx`

**Step 1: Review diff**

Run: `git diff -- src/actions/cases.ts src/actions/cases.test.ts src/components/cases/case-delete-button.tsx "src/app/(dashboard)/casos/[id]/page.tsx"`

Expected: Only the case deletion work appears.

**Step 2: Commit**

```bash
git add src/actions/cases.ts src/actions/cases.test.ts src/components/cases/case-delete-button.tsx "src/app/(dashboard)/casos/[id]/page.tsx"
git commit -m "feat: allow deleting cases"
```
