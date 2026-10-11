import { describe, expect, it } from 'vitest';
import { distanceToSegment } from './laser-geometry.ts';

describe('distanceToSegment', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 10, y: 0 };

  it('measures straight to the segment when the point is alongside it', () => {
    expect(distanceToSegment({ x: 5, y: 3 }, a, b)).toBe(3);
  });

  it('measures to the nearest end when the point is past it', () => {
    expect(distanceToSegment({ x: 13, y: 4 }, a, b)).toBe(5);
    expect(distanceToSegment({ x: -3, y: -4 }, a, b)).toBe(5);
  });

  it('treats a zero-length segment as a point', () => {
    expect(distanceToSegment({ x: 3, y: 4 }, a, a)).toBe(5);
  });

  it('is zero on the segment', () => {
    expect(distanceToSegment({ x: 4, y: 0 }, a, b)).toBe(0);
  });
});
