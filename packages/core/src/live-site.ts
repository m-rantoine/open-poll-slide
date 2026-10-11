const SITE_LABEL = /^[a-z0-9][a-z0-9._-]{0,39}$/;

/**
 * The label that tells sites sharing one database apart: lower case letters, digits, dots, dashes
 * and underscores. Returns null for an empty or invalid label.
 */
export function normalizeSiteLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const label = value.trim().toLowerCase();
  return SITE_LABEL.test(label) ? label : null;
}
