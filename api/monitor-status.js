import { supabaseAdmin, assertDb } from './_lib/supabase.js';
import { allow, fail, send } from './_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET'])) return;
  try {
    const db = supabaseAdmin();
    const last = assertDb(await db.from('monitor_runs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle());
    let queryRuns = [];
    if (last) queryRuns = assertDb(await db.from('query_runs').select('*').eq('monitor_run_id', last.id).order('id')) || [];
    const metadata = last?.metadata || {};
    send(res, {
      running: false,
      provider_status: metadata.provider_status || { google_news_rss: 'ready', direct_rss: 'ready', serper: process.env.SERPER_API_KEY ? 'ready' : 'waiting_for_api_key' },
      last: last ? {
        ...last, total_results: last.candidates_total, unique_candidates: last.candidates_new,
        duplicates: metadata.duplicates || 0, related: null, possibly_related: null, unrelated: null,
        duration_ms: metadata.duration_ms || 0, errors: Array.from({ length: last.errors_total || 0 }),
        query_runs: queryRuns.map(row => ({ provider: row.provider, query: row.query_text, results_found: row.results_count, status: row.status === 'error' ? 'failed' : row.status, message: row.error_message })),
      } : null,
    });
  } catch (error) { fail(res, error); }
}
