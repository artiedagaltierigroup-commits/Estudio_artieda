# Centro de Firmas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an independent "Centro de firmas" module to create, send, track, reuse, and download electronic signature requests for PDF documents, optionally linked to clients and cases.

**Architecture:** Add a new domain module around signature requests, documents, signers, events, and saved client signatures. Store PDFs and signature images in Supabase Storage, persist workflow state in Postgres through Drizzle, expose internal dashboard screens under `/firmas`, and expose a public token-based signing flow under `/firmar/[token]`.

**Tech Stack:** Next.js 15 App Router, React 19, Server Actions, Supabase Auth, Supabase Storage, Drizzle ORM, Postgres, Tailwind, lucide-react, Vitest, pdf-lib, react-pdf/pdf.js or a small PDF preview wrapper, signature_pad or a custom canvas capture component.

---

## Product Decisions

- Name the module **Centro de firmas** in navigation.
- Use **Nueva solicitud de firma** for the creation action.
- Use **Solicitudes de firma** for the list.
- Treat this as **firma electronica**, not firma digital certificada.
- Always require recipient consent at signing time, even when a saved client signature exists.
- If a client has a saved signature, let the signer choose **Usar mi firma guardada** or **Dibujar una nueva** from the public signing page.
- Track "correo abierto" only as best-effort because email clients can block tracking pixels. Use **link abierto**, **documento visto**, **firma iniciada**, and **firma completada** as stronger events.
- Keep client/case association optional. A request can exist with only a recipient email.

## Suggested Statuses

Use uppercase enum values in the database and Spanish labels in the UI.

- `DRAFT`: Borrador
- `READY`: Lista para enviar
- `SENT`: Enviada
- `EMAIL_OPENED`: Correo abierto
- `LINK_OPENED`: Link abierto
- `DOCUMENT_VIEWED`: Documento visto
- `SIGNING_STARTED`: Firma iniciada
- `SIGNING_INTERRUPTED`: Firma interrumpida
- `SIGNED`: Firmada
- `REJECTED`: Rechazada
- `EXPIRED`: Vencida
- `CANCELLED`: Cancelada

---

## Task 1: Add Dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Install PDF and signature libraries**

Run:

```bash
npm install pdf-lib react-pdf signature_pad
```

Expected: `package.json` and `package-lock.json` include the new dependencies.

**Step 2: Run dependency sanity check**

Run:

```bash
npm test
```

Expected: existing tests pass or fail only for pre-existing unrelated reasons.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add signature document dependencies"
```

---

## Task 2: Add Signature Database Schema

**Files:**
- Modify: `src/db/schema.ts`
- Create: generated migration under `src/db/migrations/`
- Test: `src/lib/signature-status.test.ts`
- Create: `src/lib/signature-status.ts`

**Step 1: Write status presenter tests**

Create `src/lib/signature-status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getSignatureStatusLabel, getSignatureStatusTone } from "./signature-status";

describe("signature status presenters", () => {
  it("returns Spanish labels for signature states", () => {
    expect(getSignatureStatusLabel("DRAFT")).toBe("Borrador");
    expect(getSignatureStatusLabel("SENT")).toBe("Enviada");
    expect(getSignatureStatusLabel("SIGNED")).toBe("Firmada");
  });

  it("returns stable tones for list filtering and chips", () => {
    expect(getSignatureStatusTone("SIGNED")).toBe("sage");
    expect(getSignatureStatusTone("EXPIRED")).toBe("danger");
    expect(getSignatureStatusTone("SIGNING_INTERRUPTED")).toBe("amber");
  });
});
```

Run:

```bash
npm test -- src/lib/signature-status.test.ts
```

Expected: FAIL because the module does not exist.

**Step 2: Add enum and table definitions**

Modify `src/db/schema.ts`:

```ts
export const signatureRequestStatusEnum = pgEnum("signature_request_status", [
  "DRAFT",
  "READY",
  "SENT",
  "EMAIL_OPENED",
  "LINK_OPENED",
  "DOCUMENT_VIEWED",
  "SIGNING_STARTED",
  "SIGNING_INTERRUPTED",
  "SIGNED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
]);

export const signatureEventTypeEnum = pgEnum("signature_event_type", [
  "created",
  "document_uploaded",
  "placement_selected",
  "sent",
  "email_opened",
  "link_opened",
  "document_viewed",
  "signing_started",
  "signing_interrupted",
  "signed",
  "rejected",
  "expired",
  "cancelled",
  "resent",
  "downloaded",
]);

export const signatureRequests = pgTable(
  "signature_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    message: text("message"),
    recipientName: text("recipient_name"),
    recipientEmail: text("recipient_email").notNull(),
    recipientTaxId: text("recipient_tax_id"),
    status: signatureRequestStatusEnum("status").notNull().default("DRAFT"),
    tokenHash: text("token_hash").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("signature_requests_user_id_idx").on(table.userId),
    clientIdx: index("signature_requests_client_id_idx").on(table.clientId),
    caseIdx: index("signature_requests_case_id_idx").on(table.caseId),
    statusIdx: index("signature_requests_status_idx").on(table.userId, table.status),
    recipientEmailIdx: index("signature_requests_recipient_email_idx").on(table.recipientEmail),
    tokenHashIdx: uniqueIndex("signature_requests_token_hash_idx").on(table.tokenHash),
  })
);

export const signatureDocuments = pgTable(
  "signature_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    signatureRequestId: uuid("signature_request_id")
      .notNull()
      .references(() => signatureRequests.id, { onDelete: "cascade" }),
    originalFileName: text("original_file_name").notNull(),
    originalStoragePath: text("original_storage_path").notNull(),
    signedStoragePath: text("signed_storage_path"),
    originalSha256: text("original_sha256").notNull(),
    signedSha256: text("signed_sha256"),
    pageNumber: integer("page_number").notNull().default(1),
    placementX: decimal("placement_x", { precision: 10, scale: 4 }).notNull(),
    placementY: decimal("placement_y", { precision: 10, scale: 4 }).notNull(),
    placementWidth: decimal("placement_width", { precision: 10, scale: 4 }).notNull(),
    placementHeight: decimal("placement_height", { precision: 10, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("signature_documents_user_id_idx").on(table.userId),
    requestIdx: uniqueIndex("signature_documents_request_id_idx").on(table.signatureRequestId),
  })
);

export const clientSavedSignatures = pgTable(
  "client_saved_signatures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    signerName: text("signer_name"),
    signerEmail: text("signer_email"),
    storagePath: text("storage_path").notNull(),
    sha256: text("sha256").notNull(),
    consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("client_saved_signatures_user_id_idx").on(table.userId),
    clientIdx: uniqueIndex("client_saved_signatures_client_id_idx").on(table.clientId),
  })
);

export const signatureEvents = pgTable(
  "signature_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    signatureRequestId: uuid("signature_request_id")
      .notNull()
      .references(() => signatureRequests.id, { onDelete: "cascade" }),
    type: signatureEventTypeEnum("type").notNull(),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("signature_events_user_id_idx").on(table.userId),
    requestIdx: index("signature_events_request_id_idx").on(table.signatureRequestId),
    createdAtIdx: index("signature_events_created_at_idx").on(table.signatureRequestId, table.createdAt),
  })
);
```

Also:

- Add `document` and `signature_request` to `entityTypeEnum`.
- Add `sent`, `signed`, `resent`, `cancelled`, and `downloaded` to `actionTypeEnum` if activity log should mirror signature actions.
- Add relations from clients/cases to signature requests.
- Add relations from signature requests to document, events, client, and case.

**Step 3: Add presenter helper**

Create `src/lib/signature-status.ts`:

```ts
import type { VisualTone } from "@/lib/presentation";

export type SignatureRequestStatus =
  | "DRAFT"
  | "READY"
  | "SENT"
  | "EMAIL_OPENED"
  | "LINK_OPENED"
  | "DOCUMENT_VIEWED"
  | "SIGNING_STARTED"
  | "SIGNING_INTERRUPTED"
  | "SIGNED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export function getSignatureStatusLabel(status: SignatureRequestStatus) {
  const labels: Record<SignatureRequestStatus, string> = {
    DRAFT: "Borrador",
    READY: "Lista para enviar",
    SENT: "Enviada",
    EMAIL_OPENED: "Correo abierto",
    LINK_OPENED: "Link abierto",
    DOCUMENT_VIEWED: "Documento visto",
    SIGNING_STARTED: "Firma iniciada",
    SIGNING_INTERRUPTED: "Firma interrumpida",
    SIGNED: "Firmada",
    REJECTED: "Rechazada",
    EXPIRED: "Vencida",
    CANCELLED: "Cancelada",
  };

  return labels[status];
}

export function getSignatureStatusTone(status: SignatureRequestStatus): VisualTone {
  if (status === "SIGNED") return "sage";
  if (status === "REJECTED" || status === "EXPIRED" || status === "CANCELLED") return "danger";
  if (status === "SIGNING_INTERRUPTED" || status === "READY") return "amber";
  if (status === "SENT" || status === "EMAIL_OPENED" || status === "LINK_OPENED" || status === "DOCUMENT_VIEWED") {
    return "lilac";
  }

  return "slate";
}
```

**Step 4: Generate migration**

Run:

```bash
npm run db:generate
```

Expected: a new SQL migration under `src/db/migrations/`.

**Step 5: Run tests**

Run:

```bash
npm test -- src/lib/signature-status.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/db/schema.ts src/db/migrations src/lib/signature-status.ts src/lib/signature-status.test.ts
git commit -m "feat: add signature request schema"
```

---

## Task 3: Add Storage and Hash Utilities

**Files:**
- Create: `src/lib/signature-files.ts`
- Test: `src/lib/signature-files.test.ts`

**Step 1: Write failing tests**

Create `src/lib/signature-files.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildSignatureStoragePath, hashBufferSha256 } from "./signature-files";

describe("signature file utilities", () => {
  it("builds stable private storage paths", () => {
    expect(
      buildSignatureStoragePath({
        userId: "user-1",
        requestId: "request-1",
        kind: "original",
        fileName: "contrato.pdf",
      })
    ).toBe("user-1/signature-requests/request-1/original/contrato.pdf");
  });

  it("hashes buffers with sha256", async () => {
    const hash = await hashBufferSha256(Buffer.from("firmar"));
    expect(hash).toBe("758a7f95bd78e0e85898016c65deaa9313209f62d3887ee0a23ac54d13b6d873");
  });
});
```

Run:

```bash
npm test -- src/lib/signature-files.test.ts
```

Expected: FAIL because utility does not exist.

**Step 2: Implement utility**

Create `src/lib/signature-files.ts`:

```ts
import { createHash } from "crypto";

interface BuildPathParams {
  userId: string;
  requestId: string;
  kind: "original" | "signed" | "signature" | "certificate";
  fileName: string;
}

export const SIGNATURE_BUCKET = "signature-documents";

export function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function buildSignatureStoragePath(params: BuildPathParams) {
  return `${params.userId}/signature-requests/${params.requestId}/${params.kind}/${sanitizeFileName(params.fileName)}`;
}

export async function hashBufferSha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
```

**Step 3: Run tests**

Run:

```bash
npm test -- src/lib/signature-files.test.ts
```

Expected: PASS.

**Step 4: Manual Supabase setup**

Create a private Supabase Storage bucket named:

```text
signature-documents
```

Access rules:

- Authenticated app users can upload/read files only under their own `user_id` prefix.
- Public signers cannot read bucket files directly.
- Public signing page must stream files through server routes using a valid request token.

**Step 5: Commit**

```bash
git add src/lib/signature-files.ts src/lib/signature-files.test.ts
git commit -m "feat: add signature file utilities"
```

---

## Task 4: Add Signature Server Actions

**Files:**
- Create: `src/actions/signatures.ts`
- Test: `src/actions/signatures.test.ts`
- Modify: `src/actions/activity-log.ts`
- Modify: `src/db/schema.ts`

**Step 1: Write tests for pure helpers first**

Keep DB-heavy action tests light. Extract pure helpers inside `src/actions/signatures.ts` and test:

```ts
import { describe, expect, it } from "vitest";
import { buildDefaultSignatureSubject, normalizeSignatureEmail } from "./signatures";

describe("signature action helpers", () => {
  it("builds a clear default subject", () => {
    expect(buildDefaultSignatureSubject("Contrato de honorarios")).toBe(
      "Solicitud de firma: Contrato de honorarios"
    );
  });

  it("normalizes recipient emails", () => {
    expect(normalizeSignatureEmail(" CLIENTE@MAIL.COM ")).toBe("cliente@mail.com");
  });
});
```

Run:

```bash
npm test -- src/actions/signatures.test.ts
```

Expected: FAIL.

**Step 2: Implement actions**

Create `src/actions/signatures.ts` with these exported actions:

- `getSignatureRequests(filters)`
- `getSignatureRequest(id)`
- `createSignatureDraft(formData)`
- `uploadSignatureDocument(requestId, formData)`
- `updateSignaturePlacement(requestId, placement)`
- `sendSignatureRequest(requestId)`
- `resendSignatureRequest(requestId)`
- `cancelSignatureRequest(requestId)`
- `downloadSignedDocument(requestId)`

Implementation rules:

- Reuse the local `getUserId()` pattern from existing action files.
- Always scope queries by `userId`.
- Create a token with `crypto.randomBytes(32).toString("hex")`.
- Store only a SHA-256 hash of the token in `signature_requests.token_hash`.
- Return the raw token only when sending the email.
- Default token expiration: 15 days.
- Revalidate `/firmas`, `/firmas/[id]`, `/clientes/[id]`, and `/casos/[id]` when relevant.
- Log events in `signature_events` for every important transition.
- Mirror major changes into `activity_log`.

**Step 3: Implement helper exports**

At minimum:

```ts
export function normalizeSignatureEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildDefaultSignatureSubject(fileName: string) {
  const cleanName = fileName.replace(/\.pdf$/i, "");
  return `Solicitud de firma: ${cleanName}`;
}
```

**Step 4: Add email adapter placeholder**

For first implementation, create a function in the same file:

```ts
async function sendSignatureEmail(params: {
  to: string;
  subject: string;
  message?: string | null;
  signingUrl: string;
}) {
  console.info("Signature email pending provider", params);
}
```

Later replace it with Resend, Supabase email, SMTP, or another provider.

**Step 5: Run tests**

Run:

```bash
npm test -- src/actions/signatures.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/actions/signatures.ts src/actions/signatures.test.ts src/actions/activity-log.ts src/db/schema.ts
git commit -m "feat: add signature request actions"
```

---

## Task 5: Add Navigation and Signature List Screen

**Files:**
- Modify: `src/lib/app-shell.ts`
- Create: `src/app/(dashboard)/firmas/page.tsx`
- Create: `src/components/signatures/signature-request-list.tsx`
- Create: `src/components/signatures/signature-filters.tsx`
- Test: `src/lib/app-shell.test.ts`

**Step 1: Update navigation test**

Modify `src/lib/app-shell.test.ts` to expect `/firmas`:

```ts
expect(dashboardNavigation.some((item) => item.href === "/firmas" && item.label === "Firmas")).toBe(true);
```

Run:

```bash
npm test -- src/lib/app-shell.test.ts
```

Expected: FAIL.

**Step 2: Add nav item**

Modify `src/lib/app-shell.ts`:

- Import `FileSignature` from `lucide-react`.
- Add item after `Casos` or after `Clientes`:

```ts
{
  href: "/firmas",
  label: "Firmas",
  description: "Solicitudes, documentos firmados y seguimiento",
  icon: FileSignature,
}
```

**Step 3: Build list page**

Create `src/app/(dashboard)/firmas/page.tsx`:

- Use `PageHeader`.
- Eyebrow: `Centro de firmas`.
- Title: `Solicitudes de firma`.
- Stats: total, pendientes, firmadas, vencidas.
- Action: button to `/firmas/nueva` with label `Nueva solicitud`.
- Render filters and list.

Create `src/components/signatures/signature-request-list.tsx`:

- Show recipient, subject, associated client/case, status chip, created date, last event.
- Row actions: view detail, resend if not signed/cancelled, download if signed.

Create `src/components/signatures/signature-filters.tsx`:

- Search input.
- Status filter.
- Sort filter.
- Keep query params compatible with server-side list page.

**Step 4: Run tests**

Run:

```bash
npm test -- src/lib/app-shell.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/app-shell.ts src/lib/app-shell.test.ts src/app/(dashboard)/firmas src/components/signatures
git commit -m "feat: add signature center list"
```

---

## Task 6: Add New Signature Request Wizard

**Files:**
- Create: `src/app/(dashboard)/firmas/nueva/page.tsx`
- Create: `src/components/signatures/signature-request-form.tsx`
- Create: `src/components/signatures/pdf-upload-field.tsx`
- Create: `src/components/signatures/pdf-placement-selector.tsx`
- Create: `src/components/signatures/signature-email-editor.tsx`
- Modify: `src/actions/signatures.ts`

**Step 1: Create wizard shell**

Build a single page with clear sections:

- Documento PDF
- Ubicacion de firma
- Destinatario
- Asociacion opcional
- Asunto y mensaje
- Revision y envio

Use existing `SectionCard`, `Button`, `Input`, `Textarea`, and form patterns.

**Step 2: Add PDF upload**

`pdf-upload-field.tsx` should:

- Accept only `application/pdf`.
- Show file name and size.
- Reject files larger than a configured limit, suggested 10 MB.
- Upload through server action after the draft request exists.

**Step 3: Add PDF preview and rectangle selector**

`pdf-placement-selector.tsx` should:

- Render PDF pages.
- Let the user draw/move/resize one rectangle.
- Store placement as normalized coordinates from 0 to 1:
  - `pageNumber`
  - `x`
  - `y`
  - `width`
  - `height`
- Normalize coordinates so final PDF placement works across preview sizes.

**Step 4: Add recipient and optional association**

Form fields:

- Recipient name
- Recipient email
- DNI/CUIT optional
- Client optional
- Case optional

Behavior:

- Selecting a client should allow case dropdown filtering by that client.
- If selected client has a saved signature, show an internal notice: `Este cliente tiene una firma guardada. Podra elegir reutilizarla al firmar.`

**Step 5: Add default email content**

Default subject:

```text
Solicitud de firma: {nombre del documento}
```

Default message:

```text
Hola, te enviamos este documento para revisar y firmar electronicamente. Abrilo desde el boton seguro y confirma la firma cuando estes conforme.
```

The user can edit both.

**Step 6: Add submit flow**

Submit should:

1. Create draft request.
2. Upload PDF.
3. Save placement.
4. Save recipient and message.
5. Send email.
6. Redirect to `/firmas/[id]`.

If any step fails:

- Keep the draft.
- Show recovery action.
- Allow retry from detail page.

**Step 7: Manual test**

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/firmas/nueva
```

Verify:

- Upload accepts a PDF.
- Preview renders.
- Rectangle can be selected.
- Client/case association is optional.
- Email subject is prefilled and editable.
- Submit creates a request.

**Step 8: Commit**

```bash
git add src/app/(dashboard)/firmas/nueva src/components/signatures src/actions/signatures.ts
git commit -m "feat: add signature request wizard"
```

---

## Task 7: Add Signature Detail and Tracking Screen

**Files:**
- Create: `src/app/(dashboard)/firmas/[id]/page.tsx`
- Create: `src/components/signatures/signature-event-timeline.tsx`
- Create: `src/components/signatures/signature-request-actions.tsx`
- Modify: `src/actions/signatures.ts`

**Step 1: Build detail page**

Show:

- Status
- Recipient
- Email
- Client/case links if present
- Original PDF preview
- Selected signature rectangle
- Event timeline
- Email subject and message

**Step 2: Add available actions by status**

Rules:

- `DRAFT`: edit, send, cancel.
- `READY`: send, cancel.
- `SENT`, `EMAIL_OPENED`, `LINK_OPENED`, `DOCUMENT_VIEWED`, `SIGNING_STARTED`, `SIGNING_INTERRUPTED`: resend, copy link, cancel.
- `SIGNED`: download signed PDF, download signature image, download constancy.
- `REJECTED`, `EXPIRED`, `CANCELLED`: duplicate request, view history.

**Step 3: Add event timeline**

Timeline labels:

- Solicitud creada
- Documento cargado
- Ubicacion de firma definida
- Correo enviado
- Correo abierto
- Link abierto
- Documento visto
- Firma iniciada
- Firma interrumpida
- Documento firmado
- Correo reenviado
- Solicitud cancelada
- Descarga realizada

Show date, time, optional IP/browser only where appropriate.

**Step 4: Manual test**

Open a request detail and verify:

- Status chip matches request.
- Events appear in chronological order.
- Resend/cancel actions are hidden after signed.
- Download actions appear only after signed.

**Step 5: Commit**

```bash
git add src/app/(dashboard)/firmas/[id] src/components/signatures src/actions/signatures.ts
git commit -m "feat: add signature tracking detail"
```

---

## Task 8: Add Public Signing Flow

**Files:**
- Create: `src/app/(public-signing)/firmar/[token]/page.tsx`
- Create: `src/app/(public-signing)/layout.tsx`
- Create: `src/actions/public-signatures.ts`
- Create: `src/components/signatures/public-signature-pad.tsx`
- Create: `src/components/signatures/public-signature-review.tsx`
- Create: `src/components/signatures/public-document-viewer.tsx`
- Modify: `src/middleware.ts`

**Step 1: Update middleware**

Allow unauthenticated access to:

```text
/firmar/*
```

Modify `src/middleware.ts` so unauthenticated public signing links are not redirected to `/login`.

**Step 2: Create token lookup action**

Create `src/actions/public-signatures.ts`:

- `getPublicSignatureRequest(token)`
- `trackPublicSignatureEvent(token, eventType)`
- `submitPublicSignature(token, formData)`
- `rejectPublicSignature(token, reason)`

Rules:

- Hash incoming token and compare to `tokenHash`.
- Reject expired/cancelled/signed tokens.
- Never expose internal `userId` unnecessarily.
- Log IP and user-agent from request headers where possible.

**Step 3: Create public signing page**

The page should:

- Show document name, recipient, sender/study name, and PDF preview.
- Show signature placement.
- Work well on mobile.
- Force the signature pad to landscape-like proportions on small screens.
- Let the signer draw, clear, and accept the signature.
- If saved client signature is available, offer:
  - `Usar firma guardada`
  - `Dibujar nueva firma`
- Include consent checkbox:

```text
Acepto firmar electronicamente este documento y entiendo que se registrara una constancia de fecha, hora y datos tecnicos de la operacion.
```

**Step 4: Track public events**

Trigger:

- `link_opened` when page loads.
- `document_viewed` when PDF renders.
- `signing_started` on first canvas stroke.
- `signing_interrupted` if signer starts but leaves or times out without submitting. Implement best-effort tracking with `navigator.sendBeacon` to a route handler if needed.
- `signed` on submit.
- `rejected` if signer rejects.

**Step 5: Manual mobile check**

Run dev server and test with browser responsive mode:

- 390x844 mobile viewport.
- Signature pad is usable horizontally.
- Buttons do not overflow.
- PDF preview remains readable.

**Step 6: Commit**

```bash
git add src/app/(public-signing) src/actions/public-signatures.ts src/components/signatures src/middleware.ts
git commit -m "feat: add public signing flow"
```

---

## Task 9: Generate Signed PDF

**Files:**
- Create: `src/lib/signature-pdf.ts`
- Test: `src/lib/signature-pdf.test.ts`
- Modify: `src/actions/public-signatures.ts`

**Step 1: Write PDF coordinate tests**

Create `src/lib/signature-pdf.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toPdfPlacement } from "./signature-pdf";

describe("signature pdf placement", () => {
  it("converts normalized placement into PDF points", () => {
    expect(
      toPdfPlacement({
        pageWidth: 600,
        pageHeight: 800,
        x: 0.1,
        y: 0.2,
        width: 0.5,
        height: 0.1,
      })
    ).toEqual({
      x: 60,
      y: 560,
      width: 300,
      height: 80,
    });
  });
});
```

Run:

```bash
npm test -- src/lib/signature-pdf.test.ts
```

Expected: FAIL.

**Step 2: Implement PDF helper**

Create `src/lib/signature-pdf.ts`:

- `toPdfPlacement(params)` converts normalized browser coordinates to PDF points.
- `embedSignatureInPdf(params)` loads original PDF with `pdf-lib`.
- Embed PNG signature image into selected page.
- Add a small text footer near the signature if space allows:

```text
Firmado electronicamente por {name} - {date}
```

- Return signed PDF bytes and hash.

**Step 3: Wire submit action**

When `submitPublicSignature` succeeds:

1. Store signature PNG in Supabase Storage.
2. Generate signed PDF.
3. Store signed PDF in Supabase Storage.
4. Store hashes.
5. Mark request `SIGNED`.
6. Save `signedAt`.
7. Save or update `client_saved_signatures` only if the signer consents to save it.
8. Log `signed`.

**Step 4: Run tests**

Run:

```bash
npm test -- src/lib/signature-pdf.test.ts
```

Expected: PASS.

**Step 5: Manual test**

Sign a sample PDF and verify:

- Signature appears inside selected rectangle.
- Original PDF remains unchanged.
- Signed PDF downloads correctly.
- Status changes to `Firmada`.
- Event timeline records completion.

**Step 6: Commit**

```bash
git add src/lib/signature-pdf.ts src/lib/signature-pdf.test.ts src/actions/public-signatures.ts
git commit -m "feat: generate signed signature PDFs"
```

---

## Task 10: Add Downloads for Signed PDF, Signature Image, and Constancy

**Files:**
- Create: `src/app/api/signatures/[id]/signed-document/route.ts`
- Create: `src/app/api/signatures/[id]/signature-image/route.ts`
- Create: `src/app/api/signatures/[id]/certificate/route.ts`
- Create: `src/lib/signature-certificate.ts`
- Test: `src/lib/signature-certificate.test.ts`

**Step 1: Write certificate tests**

Create `src/lib/signature-certificate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildSignatureCertificateData } from "./signature-certificate";

describe("signature certificate", () => {
  it("summarizes request, signer, hashes, and events", () => {
    const data = buildSignatureCertificateData({
      requestId: "req-1",
      subject: "Solicitud de firma: Contrato",
      signerName: "Cliente Uno",
      signerEmail: "cliente@mail.com",
      originalSha256: "original",
      signedSha256: "signed",
      signedAt: new Date("2026-06-17T15:00:00Z"),
      events: [{ type: "signed", createdAt: new Date("2026-06-17T15:00:00Z") }],
    });

    expect(data.title).toBe("Constancia de firma electronica");
    expect(data.hashes.signedSha256).toBe("signed");
  });
});
```

Run:

```bash
npm test -- src/lib/signature-certificate.test.ts
```

Expected: FAIL.

**Step 2: Implement certificate helper**

Create `src/lib/signature-certificate.ts`:

- Return structured certificate data.
- Include request id, subject, recipient, client/case if linked, original hash, signed hash, signed timestamp, event timeline.

First version can render as HTML or JSON-backed PDF later. Prefer a simple PDF generated with `pdf-lib` if time allows.

**Step 3: Implement authenticated download routes**

Routes must:

- Require logged-in user.
- Scope request by `userId`.
- Return `404` if not found.
- Return `409` if requested file is not available yet.
- Stream file from private Supabase Storage.
- Log `downloaded` event.

**Step 4: Run tests**

Run:

```bash
npm test -- src/lib/signature-certificate.test.ts
```

Expected: PASS.

**Step 5: Manual test**

From `/firmas/[id]` after a signed request:

- Download signed PDF.
- Download signature image.
- Download constancy.

**Step 6: Commit**

```bash
git add src/app/api/signatures src/lib/signature-certificate.ts src/lib/signature-certificate.test.ts
git commit -m "feat: add signature download artifacts"
```

---

## Task 11: Add Saved Client Signature Behavior

**Files:**
- Modify: `src/actions/signatures.ts`
- Modify: `src/actions/public-signatures.ts`
- Modify: `src/app/(dashboard)/firmas/nueva/page.tsx`
- Modify: `src/components/signatures/signature-request-form.tsx`
- Modify: `src/components/signatures/public-signature-review.tsx`
- Test: `src/lib/client-saved-signatures.test.ts`
- Create: `src/lib/client-saved-signatures.ts`

**Step 1: Write tests**

Create `src/lib/client-saved-signatures.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { shouldOfferSavedSignature } from "./client-saved-signatures";

describe("client saved signatures", () => {
  it("offers saved signature only when client and saved signature exist", () => {
    expect(shouldOfferSavedSignature({ clientId: "client-1", savedSignatureId: "sig-1" })).toBe(true);
    expect(shouldOfferSavedSignature({ clientId: "client-1", savedSignatureId: null })).toBe(false);
    expect(shouldOfferSavedSignature({ clientId: null, savedSignatureId: "sig-1" })).toBe(false);
  });
});
```

Run:

```bash
npm test -- src/lib/client-saved-signatures.test.ts
```

Expected: FAIL.

**Step 2: Implement helper**

Create `src/lib/client-saved-signatures.ts`:

```ts
export function shouldOfferSavedSignature(params: {
  clientId: string | null;
  savedSignatureId: string | null;
}) {
  return Boolean(params.clientId && params.savedSignatureId);
}
```

**Step 3: Dashboard behavior**

When selecting a client in the new request form:

- Query whether the client has a saved signature.
- Show a notice only.
- Do not let the internal user apply the signature.

**Step 4: Public signer behavior**

When signer opens request:

- If linked client has saved signature, show option to use it.
- Require consent checkbox either way.
- On submit, record whether saved or new signature was used.
- If a new signature is drawn and signer opts to save it, replace the previous saved signature for that client.

**Step 5: Run tests**

Run:

```bash
npm test -- src/lib/client-saved-signatures.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/lib/client-saved-signatures.ts src/lib/client-saved-signatures.test.ts src/actions src/app/(dashboard)/firmas/nueva src/components/signatures
git commit -m "feat: support saved client signatures"
```

---

## Task 12: Link Signatures from Client and Case Detail Pages

**Files:**
- Modify: `src/actions/clients.ts`
- Modify: `src/actions/cases.ts`
- Modify: `src/app/(dashboard)/clientes/[id]/page.tsx`
- Modify: `src/app/(dashboard)/casos/[id]/page.tsx`

**Step 1: Extend queries**

Update `getClient(id)` and `getCase(id)` to include recent signature requests:

- Latest 5 requests.
- Counts by pending/signed.
- Saved signature presence for clients.

**Step 2: Add dashboard sections**

Client detail:

- Add section `Firmas del cliente`.
- Show saved signature status.
- Show recent signature requests.
- Button `Nueva firma` linking to `/firmas/nueva?clientId={client.id}`.

Case detail:

- Add section `Documentos para firma`.
- Show recent requests.
- Button `Nueva firma` linking to `/firmas/nueva?caseId={case.id}&clientId={case.clientId}`.

**Step 3: Manual test**

Verify:

- Client-linked requests appear on client page.
- Case-linked requests appear on case page.
- New request button preloads association.

**Step 4: Commit**

```bash
git add src/actions/clients.ts src/actions/cases.ts src/app/(dashboard)/clientes/[id]/page.tsx src/app/(dashboard)/casos/[id]/page.tsx
git commit -m "feat: link signatures to clients and cases"
```

---

## Task 13: Add Email Provider Integration

**Files:**
- Create: `src/lib/signature-email.ts`
- Modify: `src/actions/signatures.ts`
- Modify: `.env.local` manually
- Modify: docs if needed

**Step 1: Choose provider**

Recommended: Resend, because it is simple for transactional email in Next.js.

Required env vars:

```text
RESEND_API_KEY=
SIGNATURE_EMAIL_FROM=
NEXT_PUBLIC_APP_URL=
```

Alternative: SMTP provider if the project already has one outside the repo.

**Step 2: Implement adapter**

Create `src/lib/signature-email.ts`:

- `sendSignatureRequestEmail(params)`
- `buildSigningUrl(token)`
- `buildEmailHtml(params)`
- `buildEmailText(params)`

Email CTA label:

```text
Revisar y firmar documento
```

**Step 3: Add tracking pixel route**

Optional route:

```text
/api/signatures/email-open/[token]
```

It should:

- Hash token.
- Log `email_opened`.
- Return a 1x1 transparent PNG.

Note in UI: "La apertura de correo puede no detectarse si el cliente bloquea imagenes."

**Step 4: Manual test**

Send to a real email address:

- Email arrives.
- Button opens `/firmar/[token]`.
- Timeline shows sent.
- Email opened appears only if supported.

**Step 5: Commit**

```bash
git add src/lib/signature-email.ts src/actions/signatures.ts src/app/api/signatures
git commit -m "feat: send signature request emails"
```

---

## Task 14: Add Security and Expiration Handling

**Files:**
- Modify: `src/actions/public-signatures.ts`
- Modify: `src/actions/signatures.ts`
- Create: `src/app/api/cron/signatures/route.ts`
- Test: `src/lib/signature-expiration.test.ts`
- Create: `src/lib/signature-expiration.ts`
- Modify: `vercel.json` if using Vercel cron

**Step 1: Write expiration tests**

Create `src/lib/signature-expiration.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isSignatureRequestExpired } from "./signature-expiration";

describe("signature expiration", () => {
  it("detects expired requests", () => {
    expect(
      isSignatureRequestExpired({
        status: "SENT",
        tokenExpiresAt: new Date("2026-06-01T00:00:00Z"),
        now: new Date("2026-06-17T00:00:00Z"),
      })
    ).toBe(true);
  });

  it("does not expire signed requests", () => {
    expect(
      isSignatureRequestExpired({
        status: "SIGNED",
        tokenExpiresAt: new Date("2026-06-01T00:00:00Z"),
        now: new Date("2026-06-17T00:00:00Z"),
      })
    ).toBe(false);
  });
});
```

**Step 2: Implement expiration helper**

Create `src/lib/signature-expiration.ts`.

Only expirable statuses:

- `SENT`
- `EMAIL_OPENED`
- `LINK_OPENED`
- `DOCUMENT_VIEWED`
- `SIGNING_STARTED`
- `SIGNING_INTERRUPTED`

**Step 3: Block expired public access**

Public page should show:

```text
Esta solicitud de firma vencio. Pedi al estudio que vuelva a enviarla.
```

**Step 4: Add cron route**

`src/app/api/cron/signatures/route.ts`:

- Find expired requests.
- Mark `EXPIRED`.
- Log `expired`.

Protect route with `CRON_SECRET` if current cron routes do that, or follow the existing cron pattern in `src/app/api/cron/recurring-expenses/route.ts`.

**Step 5: Run tests**

Run:

```bash
npm test -- src/lib/signature-expiration.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/lib/signature-expiration.ts src/lib/signature-expiration.test.ts src/actions src/app/api/cron/signatures vercel.json
git commit -m "feat: expire stale signature requests"
```

---

## Task 15: Polish UX, Empty States, and Accessibility

**Files:**
- Modify: `src/app/(dashboard)/firmas/page.tsx`
- Modify: `src/app/(dashboard)/firmas/nueva/page.tsx`
- Modify: `src/app/(dashboard)/firmas/[id]/page.tsx`
- Modify: `src/app/(public-signing)/firmar/[token]/page.tsx`
- Modify: `src/components/signatures/*`

**Step 1: Empty states**

Add useful empty states:

- No signature requests yet.
- No results for filters.
- No events yet.
- Signed file still being generated.

**Step 2: Loading and error states**

Add:

- Upload progress.
- PDF render failure.
- Send email failure with retry.
- Public token expired/cancelled/signed.

**Step 3: Accessibility**

Verify:

- Canvas has clear label and instructions.
- Buttons have visible labels.
- Keyboard users can clear/confirm.
- Public page has enough contrast.
- Mobile buttons do not overflow.

**Step 4: Responsive pass**

Check at:

- 390x844
- 768x1024
- 1440x900

**Step 5: Commit**

```bash
git add src/app src/components/signatures
git commit -m "feat: polish signature workflows"
```

---

## Task 16: Verification and Release Checklist

**Files:**
- Modify only if verification finds issues.

**Step 1: Run unit tests**

```bash
npm test
```

Expected: PASS.

**Step 2: Run build**

```bash
npm run build
```

Expected: PASS.

**Step 3: Run local smoke test**

```bash
npm run dev
```

Manual flow:

1. Log in.
2. Open `/firmas`.
3. Create a new signature request.
4. Upload PDF.
5. Select signature rectangle.
6. Associate client and case.
7. Send email or copy signing link.
8. Open public signing link in another browser profile.
9. Draw signature.
10. Confirm consent.
11. Submit.
12. Return to dashboard.
13. Verify status is `Firmada`.
14. Download signed PDF.
15. Download signature image.
16. Download constancy.
17. Verify client/case detail pages show the request.

**Step 4: Security check**

Verify:

- Another logged-in user cannot open or download the request.
- Public token cannot access unrelated documents.
- Expired token cannot sign.
- Signed request cannot be signed again.
- Cancelled request cannot be signed.
- Storage files are not publicly readable.

**Step 5: Commit fixes**

If fixes were needed:

```bash
git add .
git commit -m "fix: complete signature workflow verification"
```

---

## Implementation Order Recommendation

Build in this order:

1. Schema, utilities, and actions.
2. Dashboard list and detail.
3. New request wizard with PDF placement.
4. Public signing flow.
5. PDF generation and downloads.
6. Saved client signatures.
7. Client/case integration.
8. Email provider.
9. Expiration, security, and polish.

This order keeps the core domain stable before adding the more delicate PDF and public-token behavior.

## Open Decisions Before Coding

- Email provider: Resend, SMTP, Supabase Edge Function, or another service.
- Signature expiration default: suggested 15 days.
- Maximum PDF size: suggested 10 MB.
- Whether to generate constancy as PDF in v1 or structured HTML/JSON first.
- Whether the signed PDF should include only the visual signature or also a visible signature metadata footer.

## Execution Options

Plan complete and saved to `docs/plans/2026-06-17-centro-firmas.md`. Two execution options:

**1. Subagent-Driven (this session)** - Dispatch a fresh subagent per task, review between tasks, and iterate quickly.

**2. Parallel Session (separate)** - Open a new session with `executing-plans`, batch execution with checkpoints.
