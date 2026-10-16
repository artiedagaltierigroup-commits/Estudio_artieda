export interface SignatureStorageScope { userId: string; requestId: string }

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const artifactKinds = new Set(["original", "signed", "signature", "certificate"]);

// Paths stored in owner-editable rows are untrusted. Admin Storage access must derive
// its boundary from the authenticated request, never from the path's own prefix.
export function isSignatureStoragePath(path: unknown, scope: SignatureStorageScope): path is string {
  if (typeof path !== "string" || !uuid.test(scope.userId) || !uuid.test(scope.requestId)) return false;
  if (/[\\%?#:\x00-\x20\x7f]/.test(path)) return false;
  const parts = path.split("/");
  return parts.length === 5 && parts[0] === scope.userId && parts[1] === "signature-requests" &&
    parts[2] === scope.requestId && artifactKinds.has(parts[3]) && /^[A-Za-z0-9._-]+$/.test(parts[4]) &&
    parts.every((part) => part !== "." && part !== "..");
}

export function assertSignatureStoragePath(path: unknown, scope: SignatureStorageScope): asserts path is string {
  if (!isSignatureStoragePath(path, scope)) throw new Error("Archivo de firma fuera del ámbito autorizado");
}

type Owned = { userId: string };
type Scoped = Owned & { signatureRequestId: string };
type Placement = Scoped & { recipientId: string };
type Event = Scoped & { signatureRecipientId?: string | null };
interface Recipient extends Scoped {
  id: string;
  client?: (Owned & { savedSignature?: (Owned & { clientId: string }) | null; id?: string }) | null;
  placements?: ReadonlyArray<Placement>;
  events?: ReadonlyArray<Event>;
}
interface RequestGraph extends Owned {
  id: string;
  client?: Owned | null;
  case?: Owned | null;
  document?: Scoped | null;
  recipients?: ReadonlyArray<Recipient>;
  placements?: ReadonlyArray<Placement>;
  events?: ReadonlyArray<Event>;
}

// Foreign keys only prove existence. Check ownership on every loaded relation before
// using its private metadata, certificate contents, or object references.
export function isOwnedSignatureRequestGraph(request: RequestGraph, userId: string): boolean {
  if (request.userId !== userId || (request.client && request.client.userId !== userId) ||
      (request.case && request.case.userId !== userId)) return false;
  const inScope = (row: Scoped) => row.userId === userId && row.signatureRequestId === request.id;
  if (request.document && !inScope(request.document)) return false;
  const recipients = request.recipients;
  const recipientIds = new Set(recipients?.map((recipient) => recipient.id));
  const validEvent = (event: Event) => inScope(event) &&
    (!event.signatureRecipientId || !recipients || recipientIds.has(event.signatureRecipientId));
  if (recipients?.some((recipient) => !inScope(recipient) ||
      (recipient.client && (recipient.client.userId !== userId ||
        (recipient.client.savedSignature && (recipient.client.savedSignature.userId !== userId ||
          recipient.client.savedSignature.clientId !== recipient.client.id)))) ||
      recipient.placements?.some((placement) => !inScope(placement) || placement.recipientId !== recipient.id) ||
      recipient.events?.some((event) => !validEvent(event) || event.signatureRecipientId !== recipient.id))) return false;
  if (request.placements?.some((placement) => !inScope(placement) || (recipients && !recipientIds.has(placement.recipientId)))) return false;
  return !request.events?.some((event) => !validEvent(event));
}
