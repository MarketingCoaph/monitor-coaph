import { createClient } from '@supabase/supabase-js';

let client;

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada');
  client ||= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'monitor-coaph-vercel/1.0' } },
  });
  return client;
}

export function assertDb(result) {
  if (result.error) throw result.error;
  return result.data;
}
