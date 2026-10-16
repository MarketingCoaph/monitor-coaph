import { supabaseAdmin, assertDb } from './_lib/supabase.js';
import { allow, fail, send } from './_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET'])) return;
  try {
    const db = supabaseAdmin();
    const [termsResult, entitiesResult] = await Promise.all([
      db.from('search_terms').select('term').eq('active', 1).order('id'),
      db.from('case_entities').select('name,type').eq('active', 1).order('id'),
    ]);
    const terms = assertDb(termsResult) || [];
    const entities = assertDb(entitiesResult) || [];
    let query = db.from('news').select('*').order('published_at', { ascending: false, nullsFirst: false }).order('discovered_at', { ascending: false }).limit(500);
    if (req.query?.q) query = query.ilike('title', `%${String(req.query.q).slice(0, 150)}%`);
    if (req.query?.relevance) query = query.eq('relevance_status', String(req.query.relevance));
    send(res, { items: assertDb(await query) || [], tracking: { terms: terms.map(row => row.term), entities } });
  } catch (error) { fail(res, error); }
}
