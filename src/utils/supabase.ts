import { createClient } from '@supabase/supabase-js';

let _client: any = null;

export function getSupabaseClient(): any {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('[NourrIA] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante dans .env');
    }
    _client = createClient(url, key);
  }
  return _client;
}
