import { describe, expect, it } from 'vitest';
import { projectRefFromUrl } from './live-init.ts';

describe('projectRefFromUrl', () => {
  it('reads the ref from a hosted Supabase URL', () => {
    expect(projectRefFromUrl('https://typsckrpciggvydhochi.supabase.co')).toBe(
      'typsckrpciggvydhochi',
    );
    expect(projectRefFromUrl(' https://abc123.supabase.co/ ')).toBe('abc123');
  });

  it('returns null for anything else, so keys are never sent to a project we cannot identify', () => {
    for (const url of [
      'http://localhost:54321',
      'https://db.example.com',
      'https://abc.supabase.co.evil.com',
      'https://abc.def.supabase.co',
      '',
    ]) {
      expect(projectRefFromUrl(url)).toBeNull();
    }
  });
});
