import { describe, expect, it } from 'vitest';
import { parseDuration } from '../../lib/duration';
import { splitAtEquals } from '../../lib/split-equation';

describe('splitAtEquals', () => {
  it('splits at the first top-level equals sign', () => {
    expect(splitAtEquals('2x + 3 = 11')).toEqual(['2x + 3', '= 11']);
  });

  it('ignores equals signs inside braces and keeps later ones', () => {
    expect(splitAtEquals('\\frac{a=b}{c} = d = e')).toEqual(['\\frac{a=b}{c}', '= d = e']);
  });

  it('returns the whole line when there is no equals sign', () => {
    expect(splitAtEquals('x^2 - 4')).toEqual(['x^2 - 4', '']);
  });
});

describe('parseDuration', () => {
  it('reads seconds and clock strings', () => {
    expect(parseDuration(90)).toBe(90_000);
    expect(parseDuration('1:30')).toBe(90_000);
    expect(parseDuration('0:01:30')).toBe(90_000);
    expect(parseDuration('nonsense')).toBe(60_000);
  });
});
