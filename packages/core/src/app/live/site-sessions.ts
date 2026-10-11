/**
 * Several sites (one per course) can share one database. A site only lists the sessions of decks
 * it has, so a teacher does not see, or open, another course's sessions.
 */
export function onThisSite<T extends { deck_id: string }>(
  rows: readonly T[],
  deckIds: readonly string[],
): T[] {
  const mine = new Set(deckIds);
  return rows.filter((row) => mine.has(row.deck_id));
}
