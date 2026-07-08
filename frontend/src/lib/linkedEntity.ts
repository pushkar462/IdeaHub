// Handbook C3 · Linked CRM record formats. Non-blocking: a mismatch renders
// a soft-warn badge on the composer but never blocks submission.

export type LinkedEntityType = 'BILL' | 'CASE' | 'PARTNER';

export const LINKED_ENTITY_PATTERNS: Record<LinkedEntityType, { regex: RegExp; example: string; label: string }> = {
  BILL:    { regex: /^SCCS\d{4,}$/i,           example: 'SCCS0000000', label: 'Bill'    },
  CASE:    { regex: /^ATW-\d{4}-\d{4}$/i,      example: 'ATW-2026-0188', label: 'Case'   },
  PARTNER: { regex: /^P-\d{3,}$/i,             example: 'P-001',        label: 'Partner' },
};

export function isLinkedEntityFormatValid(type: LinkedEntityType | '' | undefined, id: string): boolean {
  if (!type) return true;
  if (!id) return true; // empty id is not a mismatch — it's just absent
  const p = LINKED_ENTITY_PATTERNS[type];
  return p ? p.regex.test(id.trim()) : true;
}

export function linkedEntityHint(type: LinkedEntityType | '' | undefined): string | null {
  if (!type) return null;
  const p = LINKED_ENTITY_PATTERNS[type];
  return p ? `e.g. ${p.example}` : null;
}
