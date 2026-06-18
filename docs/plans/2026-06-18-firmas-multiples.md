# Firmas Multiples Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade Centro de firmas to support one or many parallel recipients, with one or many PDF signature placements per recipient and a simplified public signing page.

**Architecture:** Introduce recipient and placement tables under each signature request. Move token, email tracking, status, signature image, and saved-signature behavior from request-level to recipient-level. Keep request-level document/case/status as the aggregate workflow and generate the final signed PDF only when every recipient has signed.

**Tech Stack:** Next.js 15 App Router, React 19, Server Actions, Supabase Auth/Storage, Drizzle ORM, Postgres, Vitest, pdf-lib, signature_pad, Resend.

---

## Task 1: Add Recipient and Placement Domain Helpers

**Files:**
- Create: `src/lib/signature-recipients.ts`
- Test: `src/lib/signature-recipients.test.ts`

**Step 1: Write failing tests**

Create tests for:

- `MAX_SIGNATURE_RECIPIENTS`
- `canAddSignatureRecipient(count)`
- `getAggregateSignatureStatus(recipients)`
- `recipientHasRequiredPlacements(recipient)`

Expected examples:

```ts
expect(canAddSignatureRecipient(49)).toBe(true);
expect(canAddSignatureRecipient(50)).toBe(false);
expect(getAggregateSignatureStatus([{ status: "SIGNED" }, { status: "SENT" }])).toBe("PARTIALLY_SIGNED");
expect(getAggregateSignatureStatus([{ status: "SIGNED" }, { status: "SIGNED" }])).toBe("SIGNED");
```

**Step 2: Run failing test**

Run:

```bash
npm test -- src/lib/signature-recipients.test.ts
```

Expected: FAIL because helper does not exist.

**Step 3: Implement helper**

Create pure helpers only. Do not touch DB yet.

**Step 4: Run test**

Run:

```bash
npm test -- src/lib/signature-recipients.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/signature-recipients.ts src/lib/signature-recipients.test.ts
git commit -m "feat: add signature recipient helpers"
```

---

## Task 2: Add Multi-Recipient Schema

**Files:**
- Modify: `src/db/schema.ts`
- Create: generated migration under `src/db/migrations/`
- Modify: `src/lib/signature-status.ts`
- Test: `src/lib/signature-status.test.ts`

**Step 1: Extend status tests**

Add expectations for:

```ts
expect(getSignatureStatusLabel("PARTIALLY_SIGNED")).toBe("Parcialmente firmada");
expect(getSignatureStatusTone("PARTIALLY_SIGNED")).toBe("amber");
```

Run:

```bash
npm test -- src/lib/signature-status.test.ts
```

Expected: FAIL.

**Step 2: Update status enum and presenter**

Add request status:

```ts
"PARTIALLY_SIGNED"
```

Add recipient status enum:

```ts
export const signatureRecipientStatusEnum = pgEnum("signature_recipient_status", [
  "DRAFT",
  "READY",
  "SENT",
  "EMAIL_OPENED",
  "LINK_OPENED",
  "SIGNING_STARTED",
  "SIGNED",
  "EXPIRED",
  "CANCELLED",
]);
```

**Step 3: Add tables**

Add `signatureRecipients`:

- id
- userId
- signatureRequestId
- clientId nullable
- firstName
- lastName
- fullName nullable
- email
- taxId nullable
- status
- tokenHash unique
- tokenExpiresAt
- sentAt
- signedAt
- cancelledAt
- color
- sortOrder
- signatureStoragePath nullable
- signatureSha256 nullable
- createdAt/updatedAt

Add `signaturePlacements`:

- id
- userId
- signatureRequestId
- recipientId
- pageNumber
- placementX/Y/Width/Height
- sortOrder
- createdAt/updatedAt

Update `signatureEvents` with nullable `signatureRecipientId` and `signaturePlacementId`.

Keep legacy recipient fields on `signatureRequests` during migration for compatibility, but new code should read recipients.

**Step 4: Add relations**

Add request-to-recipients, recipient-to-placements, recipient-to-client, events-to-recipient, events-to-placement.

**Step 5: Generate migration**

Run:

```bash
npm run db:generate
```

**Step 6: Run tests**

Run:

```bash
npm test -- src/lib/signature-status.test.ts
npx tsc --noEmit
```

Expected: PASS.

**Step 7: Commit**

```bash
git add src/db/schema.ts src/db/migrations src/lib/signature-status.ts src/lib/signature-status.test.ts
git commit -m "feat: add multi-recipient signature schema"
```

---

## Task 3: Add Migration Compatibility Utilities

**Files:**
- Create: `src/lib/signature-legacy-migration.ts`
- Test: `src/lib/signature-legacy-migration.test.ts`
- Modify: generated migration SQL if needed

**Step 1: Write tests**

Test that a legacy request maps to one recipient and one placement.

**Step 2: Run failing test**

Run:

```bash
npm test -- src/lib/signature-legacy-migration.test.ts
```

Expected: FAIL.

**Step 3: Implement pure mapping helper**

The helper returns recipient insert values and placement insert values from old request/document data.

**Step 4: Update migration SQL**

If Drizzle cannot express data migration automatically, append SQL that:

- creates one recipient for each existing request;
- copies request token hash and expiration into that recipient;
- creates one placement from existing `signature_documents` placement fields;
- backfills event `signature_recipient_id` where possible.

**Step 5: Run tests**

Run:

```bash
npm test -- src/lib/signature-legacy-migration.test.ts
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/lib/signature-legacy-migration.ts src/lib/signature-legacy-migration.test.ts src/db/migrations
git commit -m "feat: migrate legacy signature requests"
```

---

## Task 4: Update Signature Request Actions

**Files:**
- Modify: `src/actions/signatures.ts`
- Test: `src/actions/signatures.test.ts`

**Step 1: Add failing helper tests**

Add tests for:

- parsing form recipients from FormData;
- validating at least one recipient;
- validating each recipient has email;
- validating max recipient count only at limit;
- building per-recipient email payloads.

**Step 2: Run failing tests**

Run:

```bash
npm test -- src/actions/signatures.test.ts
```

Expected: FAIL.

**Step 3: Implement helper exports**

Export pure helpers:

- `parseSignatureRecipientsFromFormData(formData)`
- `validateSignatureRecipients(recipients)`
- `buildRecipientTokenPayloads(recipients)`

**Step 4: Update actions**

Replace single recipient writes with:

- create request;
- create recipients;
- create placements;
- send one email per recipient;
- update request aggregate status.

Keep old `createSignatureDraft` signature if possible, but parse dynamic indexed field names:

```text
recipients[0].firstName
recipients[0].lastName
recipients[0].email
recipients[0].taxId
recipients[0].clientId
recipients[0].placements[0].x
...
```

**Step 5: Update send/resend/cancel**

- `sendSignatureRequest(requestId)` sends to all unsent/pending recipients.
- `resendSignatureRequest(requestId)` resends to all pending recipients.
- Add `resendSignatureRecipient(requestId, recipientId)`.
- `cancelSignatureRequest` cancels request and recipients.
- Add `deleteSignatureRequest(requestId)` if product wants hard delete.

**Step 6: Run tests**

Run:

```bash
npm test -- src/actions/signatures.test.ts
npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add src/actions/signatures.ts src/actions/signatures.test.ts
git commit -m "feat: update signature actions for multiple recipients"
```

---

## Task 5: Rebuild New Request Form Recipient UI

**Files:**
- Modify: `src/components/signatures/signature-request-form.tsx`
- Create: `src/components/signatures/signature-recipient-editor.tsx`
- Create: `src/components/signatures/signature-recipient-list.tsx`
- Modify: `src/app/(dashboard)/firmas/nueva/page.tsx`

**Step 1: Build dynamic recipients UI**

Rules:

- start with one recipient;
- button `Agregar destinatario`;
- when max reached, show the limit message only then;
- each recipient has first name, last name, email, DNI/CUIT, client select;
- selecting client autofills person fields;
- remove recipient button hidden/disabled when only one recipient remains.

**Step 2: Move case outside recipients**

Keep global case selector near the document or association section.

**Step 3: Encode FormData**

Use indexed field names for recipients and placements.

**Step 4: Run typecheck**

Run:

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/components/signatures src/app/(dashboard)/firmas/nueva/page.tsx
git commit -m "feat: add dynamic signature recipients form"
```

---

## Task 6: Rebuild Placement Selector for Recipients and Multiple Spaces

**Files:**
- Modify: `src/components/signatures/pdf-placement-selector.tsx`
- Create: `src/components/signatures/signature-placement-editor.tsx`
- Test: `src/lib/signature-placement-colors.test.ts`
- Create: `src/lib/signature-placement-colors.ts`

**Step 1: Write color helper tests**

Test stable color assignment by recipient index and active placement state.

**Step 2: Run failing test**

Run:

```bash
npm test -- src/lib/signature-placement-colors.test.ts
```

Expected: FAIL.

**Step 3: Implement color helper**

Use a small stable palette with good contrast.

**Step 4: Build editor**

Behavior:

- active recipient selector;
- all placements visible;
- active recipient placements emphasized;
- `Agregar espacio` for active recipient;
- move/resize active placement;
- delete placement;
- hidden inputs for every placement.

**Step 5: Validate UI state**

Disable submit or show validation if any recipient has zero placements.

**Step 6: Run checks**

Run:

```bash
npm test -- src/lib/signature-placement-colors.test.ts
npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add src/components/signatures src/lib/signature-placement-colors.ts src/lib/signature-placement-colors.test.ts
git commit -m "feat: support multiple signature placements"
```

---

## Task 7: Simplify Public Signing Flow

**Files:**
- Modify: `src/actions/public-signatures.ts`
- Modify: `src/app/(public-signing)/firmar/[token]/page.tsx`
- Modify: `src/components/signatures/public-signature-pad.tsx`
- Modify: `src/components/signatures/public-signature-review.tsx`
- Remove or stop using: `src/components/signatures/public-document-viewer.tsx`

**Step 1: Update token lookup**

Look up `signatureRecipients.tokenHash`, not request token.

Return:

- request subject;
- message;
- recipient name/email;
- saved signature availability for that recipient client;
- recipient status.

Do not return PDF preview.

**Step 2: Update tracking**

Track events with both `signatureRequestId` and `signatureRecipientId`.

**Step 3: Update page**

Remove PDF preview and placement display.

Show:

- request subject;
- message;
- recipient identity;
- signature pad;
- clear icon/button;
- confirm button;
- thank-you state.

**Step 4: Run checks**

Run:

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/actions/public-signatures.ts src/app/(public-signing) src/components/signatures
git commit -m "feat: simplify recipient signing page"
```

---

## Task 8: Generate PDFs with Multiple Recipients and Placements

**Files:**
- Modify: `src/lib/signature-pdf.ts`
- Test: `src/lib/signature-pdf.test.ts`
- Modify: `src/actions/public-signatures.ts`
- Modify: `src/app/api/signatures/[id]/certificate/route.ts`

**Step 1: Add failing PDF tests**

Add tests for:

- placing the same signature image in two placements;
- placing signatures for two recipients;
- aggregate signed hash changes.

**Step 2: Run failing tests**

Run:

```bash
npm test -- src/lib/signature-pdf.test.ts
```

Expected: FAIL.

**Step 3: Implement multi-placement PDF helper**

Add:

```ts
embedRecipientSignaturesInPdf({
  originalPdfBytes,
  recipients: [
    { signerName, signedAt, signaturePngBytes, placements: [...] }
  ]
})
```

Keep existing single helper if needed for compatibility.

**Step 4: Wire public submit**

When a recipient signs:

- store recipient signature PNG;
- mark recipient signed;
- update aggregate request status;
- if all recipients signed, generate final PDF with all recipient signatures;
- keep original PDF until all signed.

**Step 5: Add manual partial PDF route/action**

Create internal route or action:

```text
/api/signatures/[id]/partial-document
```

It generates a PDF with all currently signed recipients.

**Step 6: Run tests**

Run:

```bash
npm test -- src/lib/signature-pdf.test.ts
npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add src/lib/signature-pdf.ts src/lib/signature-pdf.test.ts src/actions/public-signatures.ts src/app/api/signatures
git commit -m "feat: generate PDFs for multiple signers"
```

---

## Task 9: Update List, Detail, and Actions UI

**Files:**
- Modify: `src/components/signatures/signature-request-list.tsx`
- Modify: `src/app/(dashboard)/firmas/[id]/page.tsx`
- Modify: `src/components/signatures/signature-request-actions.tsx`
- Modify: `src/components/signatures/signature-event-timeline.tsx`
- Create: `src/components/signatures/signature-recipient-status-list.tsx`

**Step 1: List page**

Show:

- total recipients;
- progress;
- aggregate status;
- latest event.

**Step 2: Detail page**

Show:

- progress summary;
- recipient table;
- per-recipient status;
- per-recipient events;
- copy/resend per recipient;
- resend all pending;
- download final PDF;
- generate/download PDF with current signatures.

**Step 3: Actions**

Add action buttons:

- `Reenviar pendientes`
- recipient row action `Reenviar`
- `PDF con firmas actuales`
- `Eliminar solicitud`

**Step 4: Run checks**

Run:

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/app/(dashboard)/firmas src/components/signatures
git commit -m "feat: show multi-recipient signature tracking"
```

---

## Task 10: Update Email Sending and Tracking Pixel

**Files:**
- Modify: `src/lib/signature-email.ts`
- Modify: `src/app/api/signatures/email-open/[token]/route.ts`
- Test: `src/lib/signature-email.test.ts`

**Step 1: Update tests**

Add test that signing URL uses recipient token and email text stays generic.

**Step 2: Update email adapter**

Build email per recipient:

- recipient-specific signing URL;
- same request subject/message;
- optional per-recipient tracking pixel.

**Step 3: Update email-open route**

Hash token against `signatureRecipients.tokenHash`.

Log event with `signatureRecipientId`.

**Step 4: Run tests**

Run:

```bash
npm test -- src/lib/signature-email.test.ts
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/lib/signature-email.ts src/lib/signature-email.test.ts src/app/api/signatures/email-open
git commit -m "feat: send recipient-specific signature emails"
```

---

## Task 11: Update Expiration and Cron

**Files:**
- Modify: `src/lib/signature-expiration.ts`
- Test: `src/lib/signature-expiration.test.ts`
- Modify: `src/app/api/cron/signatures/route.ts`

**Step 1: Update tests**

Test recipient expiration and aggregate request expiration.

**Step 2: Update helper**

Expire recipients individually.

Request expires only when all non-terminal recipients are expired/cancelled or when request-level policy says so.

**Step 3: Update cron**

Find expired recipients, mark them expired, log recipient events, update request aggregate status.

**Step 4: Run tests**

Run:

```bash
npm test -- src/lib/signature-expiration.test.ts
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/lib/signature-expiration.ts src/lib/signature-expiration.test.ts src/app/api/cron/signatures/route.ts
git commit -m "feat: expire pending signature recipients"
```

---

## Task 12: Update Client and Case Detail Links

**Files:**
- Modify: `src/actions/clients.ts`
- Modify: `src/actions/cases.ts`
- Modify: `src/app/(dashboard)/clientes/[id]/page.tsx`
- Modify: `src/app/(dashboard)/casos/[id]/page.tsx`
- Modify: `src/lib/signature-summaries.ts`
- Test: `src/lib/signature-summaries.test.ts`

**Step 1: Update summaries**

Count recipients and aggregate request statuses.

**Step 2: Update queries**

Client detail should show requests where any recipient is linked to the client.

Case detail still shows requests linked to the case.

**Step 3: Update UI**

Show recipient progress instead of one recipient.

**Step 4: Run tests**

Run:

```bash
npm test -- src/lib/signature-summaries.test.ts
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/actions/clients.ts src/actions/cases.ts src/app/(dashboard)/clientes/[id]/page.tsx src/app/(dashboard)/casos/[id]/page.tsx src/lib/signature-summaries.ts src/lib/signature-summaries.test.ts
git commit -m "feat: link multi-recipient signatures to records"
```

---

## Task 13: Polish and Accessibility

**Files:**
- Modify: `src/components/signatures/*`
- Modify: `src/app/(dashboard)/firmas/*`
- Modify: `src/app/(public-signing)/firmar/[token]/page.tsx`

**Step 1: Internal UX polish**

Check:

- recipient cards do not overflow;
- placement colors are readable;
- active placement is obvious;
- add/remove controls have labels;
- hidden max limit message only appears at limit.

**Step 2: Public UX polish**

Check:

- signature pad is usable at 390x844;
- clear icon has label;
- thank-you state prevents repeat signing;
- no PDF preview appears.

**Step 3: Run checks**

Run:

```bash
npx tsc --noEmit
npm run build
```

**Step 4: Commit**

```bash
git add src/app src/components/signatures
git commit -m "feat: polish multi-recipient signature workflow"
```

---

## Task 14: Full Verification

**Files:**
- Modify only if verification finds issues.

**Step 1: Run tests**

Run:

```bash
npm test
```

Expected: PASS.

**Step 2: Run typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

**Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

**Step 4: Manual smoke test**

Verify:

1. Create request with one recipient.
2. Create request with three recipients.
3. Associate different clients to different recipients.
4. Add multiple placement spaces for one recipient.
5. Send request.
6. Open one recipient link and sign.
7. Confirm request becomes partially signed.
8. Generate PDF with current signatures.
9. Sign remaining recipients.
10. Confirm final PDF generates.
11. Resend pending recipient.
12. Reopen signed recipient link and confirm it cannot sign again.

**Step 5: Commit fixes if needed**

```bash
git add .
git commit -m "fix: complete multi-recipient signature verification"
```

---

## Execution Notes

- Do not remove legacy request recipient columns until the migration has been validated in production.
- Preserve existing signed requests.
- Keep TDD for pure logic helpers and PDF behavior.
- Commit after every task.
- Do not push to `main` until full verification passes.
