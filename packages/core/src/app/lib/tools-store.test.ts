import { describe, expect, it } from 'vitest';
import { timerRemaining, timerRunning } from './tools-store';

describe('timer state', () => {
  const base = { durationMs: 60_000, endsAt: null, pausedMs: null };

  it('shows the full duration until started', () => {
    expect(timerRemaining(base, 1000)).toBe(60_000);
    expect(timerRunning(base, 1000)).toBe(false);
  });

  it('counts down while running and stops at zero', () => {
    const running = { ...base, endsAt: 61_000 };
    expect(timerRemaining(running, 31_000)).toBe(30_000);
    expect(timerRunning(running, 31_000)).toBe(true);
    expect(timerRemaining(running, 99_000)).toBe(0);
    expect(timerRunning(running, 99_000)).toBe(false);
  });

  it('keeps the time left while paused', () => {
    expect(timerRemaining({ ...base, pausedMs: 12_000 }, 5_000)).toBe(12_000);
  });
});
