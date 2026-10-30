import { supabaseAdmin, assertDb } from './_lib/supabase.js';
import { allow, fail, send } from './_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET'])) return;
  try {
    const db = supabaseAdmin();
    const [{ count: total, error: countError }, runResult] = await Promise.all([
      db.from('news').select('*', { count: 'exact', head: true }).neq('relevance_status', 'unrelated'),
      db.from('monitor_runs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (countError) throw countError;
    const run = assertDb(runResult);
    send(res, { total: total || 0, last_run: run?.finished_at || run?.started_at || null, monitor_ok: Boolean(run && ['success', 'partial'].includes(run.status)), run });
  } catch (error) { fail(res, error); }
}
