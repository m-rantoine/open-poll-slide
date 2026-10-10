import type { Locale } from '../../locale/types';

export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String(e.message);
  return String(e);
}

/** The database raises short codes (`question_closed`, …); show them in the reader's language. */
export function liveErrorMessage(t: Locale, e: unknown): string {
  const text = errorText(e);
  const errors: Record<string, string> = t.live.errors;
  return Object.hasOwn(errors, text) ? errors[text] : text || errors.generic;
}
