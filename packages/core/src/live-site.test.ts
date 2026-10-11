import { describe, expect, it } from 'vitest';
import { normalizeSiteLabel } from './live-site.ts';

describe('normalizeSiteLabel', () => {
  it('trims and lower-cases a valid label', () => {
    expect(normalizeSiteLabel(' Bio-11 ')).toBe('bio-11');
    expect(normalizeSiteLabel('sbi3u.2026_fall')).toBe('sbi3u.2026_fall');
  });

  it('rejects empty, odd or over-long labels', () => {
    for (const bad of ['', '   ', '-bio', 'bio 11', 'bio/11', 'é', 'a'.repeat(41), undefined, 7]) {
      expect(normalizeSiteLabel(bad)).toBeNull();
    }
    expect(normalizeSiteLabel('a'.repeat(40))).toBe('a'.repeat(40));
  });
});
