/**
 * Several sites (one per course) can share one database. A session started with a site label
 * belongs to that site alone; one without a label (older ones, or from a site that sets none)
 * belongs to any site that has its deck.
 */
export function onThisSite<T extends { deck_id: string; site?: string | null }>(
  rows: readonly T[],
  deckIds: readonly string[],
  site: string | null = null,
): T[] {
  const mine = new Set(deckIds);
  return rows.filter((row) => (row.site ? row.site === site : mine.has(row.deck_id)));
}

/** A PostgREST `or` filter that keeps unlabeled sessions and this site's own. */
export function siteFilter(site: string | null): string {
  return site ? `site.is.null,site.eq.${site}` : 'site.is.null';
}
