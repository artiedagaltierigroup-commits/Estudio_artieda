# Task Creation Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the complete task creation form into a responsive modal opened from the Tareas page header.

**Architecture:** Keep the reminders page as a server component that loads access and reference data. Add a focused client component backed by Radix Dialog to own open/close behavior while posting the unchanged form to the existing server action.

**Tech Stack:** Next.js 15, React 19, TypeScript, Radix UI Dialog, Tailwind CSS, Vitest.

---

### Task 1: Add the modal behavior contract

**Files:**
- Create: `src/components/reminders/create-reminder-dialog.test.tsx`
- Modify: `src/app/(dashboard)/collaborator-pages.test.tsx`

**Step 1: Write the failing tests**

Test that the dialog trigger says `Nueva tarea`, the dialog contains every existing field and both close controls, and the reminders page no longer renders `Criterio` or the fixed `Alta rápida` card.

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/reminders/create-reminder-dialog.test.tsx src/app/(dashboard)/collaborator-pages.test.tsx`

Expected: FAIL because the dialog component does not exist and the old cards are still rendered.

**Step 3: Commit the failing behavior contract with the implementation in Task 2**

The tests and implementation form one red-green commit.

### Task 2: Implement the responsive creation dialog

**Files:**
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/reminders/create-reminder-dialog.tsx`
- Modify: `src/app/(dashboard)/recordatorios/page.tsx`

**Step 1: Add the shared Radix dialog primitives**

Expose `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, and `DialogClose` with the app's existing visual language and accessible close button.

**Step 2: Move the complete form into a client component**

Pass the server action, current access details, assistants, clients, and cases as serializable props. Preserve all names, defaults, permission-specific assignment behavior, and the existing submit button.

**Step 3: Place the trigger in `PageHeader.actions`**

Render the new component as the Tareas header action and delete both the fixed `Alta rápida` and `Criterio` cards.

**Step 4: Run focused tests to verify they pass**

Run: `npm test -- src/components/reminders/create-reminder-dialog.test.tsx src/app/(dashboard)/collaborator-pages.test.tsx`

Expected: PASS.

**Step 5: Commit**

Run: `git add src/components/ui/dialog.tsx src/components/reminders/create-reminder-dialog.tsx src/components/reminders/create-reminder-dialog.test.tsx src/app/(dashboard)/recordatorios/page.tsx src/app/(dashboard)/collaborator-pages.test.tsx && git commit -m "feat: move task creation into modal"`

### Task 3: Verify and publish

**Files:**
- No source changes expected.

**Step 1: Run the full automated checks**

Run: `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

Expected: all commands exit successfully with zero failures.

**Step 2: Check the production build visually**

Verify desktop and mobile layouts, dialog opening and closing, keyboard dismissal, internal scrolling, and the unchanged create flow for both roles.

**Step 3: Commit any verification fixes through a new failing test first**

If a defect is found, add a focused regression test, observe it fail, apply the minimum fix, and rerun verification.

**Step 4: Push and deploy to production**

Push `codex/reminder-assignment` and deploy the verified commit to the existing Vercel production project.
