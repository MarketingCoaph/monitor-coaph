import { supabaseAdmin, assertDb } from './_lib/supabase.js';
import { allow, fail, send } from './_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET'])) return;
  try {
    let query = supabaseAdmin().from('news').select('*').neq('relevance_status', 'unrelated').order('published_at', { ascending: false, nullsFirst: false }).order('discovered_at', { ascending: false }).limit(500);
    if (req.query?.q) query = query.ilike('title', `%${String(req.query.q).slice(0, 150)}%`);
    if (req.query?.relevance) query = query.eq('relevance_status', String(req.query.relevance));
    send(res, { items: assertDb(await query) || [] });
  } catch (error) { fail(res, error); }
}
