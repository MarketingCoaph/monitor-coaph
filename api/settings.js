import { supabaseAdmin, assertDb } from './_lib/supabase.js';
import { allow, body, fail, send } from './_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET', 'PUT'])) return;
  try {
    const db = supabaseAdmin();
    if (req.method === 'GET') {
      const rows = assertDb(await db.from('settings').select('setting_key,setting_value')) || [];
      return send(res, Object.fromEntries(rows.map(row => [row.setting_key, row.setting_value])));
    }
    const input = body(req), allowed = ['case_context', 'monitor_stale_hours', 'monitor_start_date'];
    const rows = allowed.filter(key => input[key] !== undefined).map(key => ({ setting_key: key, setting_value: String(input[key]) }));
    if (rows.length) assertDb(await db.from('settings').upsert(rows, { onConflict: 'setting_key' }));
    send(res, { updated: true });
  } catch (error) { fail(res, error); }
}
