import { describe, expect, it } from 'vitest';
import { onThisSite } from './site-sessions.ts';

describe('onThisSite', () => {
  const rows = [
    { code: 'A', deck_id: 'bio-intro' },
    { code: 'B', deck_id: 'chem-intro' },
    { code: 'C', deck_id: 'bio-cells' },
  ];

  it('keeps only sessions of decks this site has', () => {
    expect(onThisSite(rows, ['bio-intro', 'bio-cells']).map((r) => r.code)).toEqual(['A', 'C']);
  });

  it('keeps the original order and shows nothing for a site with no matching decks', () => {
    expect(onThisSite(rows, ['bio-cells', 'bio-intro']).map((r) => r.code)).toEqual(['A', 'C']);
    expect(onThisSite(rows, ['physics'])).toEqual([]);
    expect(onThisSite(rows, [])).toEqual([]);
  });
});
