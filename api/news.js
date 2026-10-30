import { supabaseAdmin, assertDb } from './_lib/supabase.js';
import { allow, fail, send } from './_lib/http.js';
import { isTrackedNews } from '../monitor/utils/tracking.js';
import { deduplicateNews } from '../monitor/utils/deduplicate.js';

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
    const tracking = { terms: terms.map(row => row.term), entities };
    const items = [];
    const pageSize = 1000;
    for (let from = 0; from < 5000; from += pageSize) {
      let query = db.from('news').select('*')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('discovered_at', { ascending: false })
        .range(from, from + pageSize - 1);
      if (req.query?.q) query = query.ilike('title', `%${String(req.query.q).slice(0, 150)}%`);
      if (req.query?.relevance) query = query.eq('relevance_status', String(req.query.relevance));
      const page = assertDb(await query) || [];
      items.push(...page);
      if (page.length < pageSize) break;
    }
    send(res, { items: deduplicateNews(items.filter(item => isTrackedNews(item, tracking))), tracking });
  } catch (error) { fail(res, error); }
}
