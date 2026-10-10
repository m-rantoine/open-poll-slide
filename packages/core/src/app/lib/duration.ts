/** `90`, `'1:30'` and `'0:01:30'` all mean ninety seconds. */
export function parseDuration(value: number | string): number {
  if (typeof value === 'number') return Math.max(1, value) * 1000;
  const parts = value.split(':').map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) return 60_000;
  return (
    Math.max(
      1,
      parts.reduce((total, p) => total * 60 + p, 0),
    ) * 1000
  );
}
