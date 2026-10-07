import config from 'virtual:open-slide/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type Client = SupabaseClient<Database>;

let client: Client | null = null;

export const liveConfigured = Boolean(config.live?.supabaseUrl && config.live?.supabaseKey);

export function getClient(): Client {
  if (!config.live)
    throw new Error('Live sessions are not configured. Set `live` in open-slide.config.ts.');
  client ??= createClient<Database>(config.live.supabaseUrl, config.live.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

export const allowedEmailDomains = config.live?.allowedEmailDomains ?? [];
