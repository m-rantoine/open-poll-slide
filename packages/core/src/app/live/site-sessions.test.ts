import { describe, expect, it } from 'vitest';
import { onThisSite, siteFilter } from './site-sessions.ts';

describe('onThisSite', () => {
  const rows = [
    { code: 'A', deck_id: 'intro', site: null },
    { code: 'B', deck_id: 'intro', site: 'chem-12' },
    { code: 'C', deck_id: 'cells', site: 'bio-11' },
    { code: 'D', deck_id: 'optics', site: null },
  ];
  const decks = ['intro', 'cells'];

  it('keeps unlabeled sessions of decks this site has, and its own labeled ones', () => {
    expect(onThisSite(rows, decks, 'bio-11').map((r) => r.code)).toEqual(['A', 'C']);
  });

  it('does not show a session labeled for another site, even for a deck with the same name', () => {
    expect(onThisSite(rows, decks, 'chem-12').map((r) => r.code)).toEqual(['A', 'B']);
  });

  it('shows a site without a label only unlabeled sessions of its decks', () => {
    expect(onThisSite(rows, decks).map((r) => r.code)).toEqual(['A']);
  });

  it('works with rows that have no site column and with no matching decks', () => {
    expect(onThisSite([{ deck_id: 'intro' }], decks)).toHaveLength(1);
    expect(onThisSite(rows, ['physics'], 'bio-11').map((r) => r.code)).toEqual(['C']);
  });
});

describe('siteFilter', () => {
  it('asks for unlabeled sessions and, with a label, this site is own', () => {
    expect(siteFilter(null)).toBe('site.is.null');
    expect(siteFilter('bio-11')).toBe('site.is.null,site.eq.bio-11');
  });
});
