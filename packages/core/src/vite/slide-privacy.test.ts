import { describe, expect, it } from 'vitest';
import { defaultPrivateFromEnv, extractPrivacy } from './slide-privacy.ts';

describe('extractPrivacy', () => {
  it('reads a boolean literal export', () => {
    expect(extractPrivacy('export const isPrivate = true;\nexport default [];')).toBe(true);
    expect(extractPrivacy('export const isPrivate = false;')).toBe(false);
    expect(extractPrivacy('export const isPrivate: boolean = true;')).toBe(true);
  });

  it('returns null when absent, not exported, or not a literal', () => {
    expect(extractPrivacy('export default [];')).toBeNull();
    expect(extractPrivacy('const isPrivate = true;')).toBeNull();
    expect(extractPrivacy('export const isPrivate = process.env.X === "1";')).toBeNull();
    expect(extractPrivacy('export const meta = { isPrivate: true };')).toBeNull();
  });

  it('ignores the word in strings and comments', () => {
    expect(extractPrivacy('// isPrivate\nexport const note = "isPrivate";')).toBeNull();
  });
});

describe('defaultPrivateFromEnv', () => {
  it('is public unless explicitly truthy', () => {
    expect(defaultPrivateFromEnv(undefined)).toBe(false);
    expect(defaultPrivateFromEnv('')).toBe(false);
    expect(defaultPrivateFromEnv('false')).toBe(false);
    expect(defaultPrivateFromEnv('0')).toBe(false);
    expect(defaultPrivateFromEnv('true')).toBe(true);
    expect(defaultPrivateFromEnv(' TRUE ')).toBe(true);
    expect(defaultPrivateFromEnv('1')).toBe(true);
    expect(defaultPrivateFromEnv('yes')).toBe(true);
  });
});
