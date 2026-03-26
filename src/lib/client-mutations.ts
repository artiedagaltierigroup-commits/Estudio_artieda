function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeClientMutationInput(input: {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  languages?: string;
  notes?: string;
}) {
  return {
    name: input.name.trim(),
    taxId: normalizeOptionalText(input.taxId),
    email: normalizeOptionalText(input.email),
    phone: normalizeOptionalText(input.phone),
    address: normalizeOptionalText(input.address),
    languages: normalizeOptionalText(input.languages),
    notes: normalizeOptionalText(input.notes),
  };
}
