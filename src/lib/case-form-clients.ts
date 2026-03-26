export interface CaseFormClientOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
}

export function filterCaseFormClients<T extends CaseFormClientOption>(clients: T[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return clients;

  return clients.filter((client) =>
    [client.name, client.email, client.phone, client.taxId]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery))
  );
}
