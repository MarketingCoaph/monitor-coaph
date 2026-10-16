import crypto from 'node:crypto';
import { supabaseAdmin, assertDb } from '../../api/_lib/supabase.js';
import { normalizeTitle } from '../utils/text.js';
import { normalizeUrl, domainOf } from '../utils/url.js';

const hashOf = item => crypto.createHash('sha256').update(`${normalizeTitle(item.title)}|${normalizeUrl(item.normalized_url || item.url)}`).digest('hex');

export class SupabaseCandidateStore {
  async load() { return null; }

  async getConfig() {
    const db = supabaseAdmin();
    const [queriesResult, sourcesResult] = await Promise.all([
      db.from('search_queries').select('id,query_text,weight').eq('active', true).order('weight', { ascending: false }),
      db.from('sources').select('id,name,url,trust_level').eq('active', 1).eq('provider', 'direct_rss').order('trust_level', { ascending: false }),
    ]);
    return {
      queries: (assertDb(queriesResult) || []).map(row => ({ id: String(row.id), query: row.query_text, priority: row.weight })),
      sources: (assertDb(sourcesResult) || []).map(row => ({ id: String(row.id), name: row.name, url: row.url, priority: row.trust_level })),
    };
  }

  async save(snapshot) {
    const db = supabaseAdmin(), run = snapshot.run;
    const runRow = assertDb(await db.from('monitor_runs').insert({
      trigger_type: run.trigger_type || 'manual', status: run.errors?.length ? 'partial' : 'success',
      window_start: process.env.MONITOR_START_DATE ? `${process.env.MONITOR_START_DATE}T00:00:00-03:00` : '2026-10-08T00:00:00-03:00',
      window_end: run.finished_at, started_at: run.started_at, finished_at: run.finished_at,
      queries_total: run.query_runs?.length || 0, candidates_total: run.total_results || 0,
      candidates_new: run.unique_candidates || 0, news_new: 0, errors_total: run.errors?.length || 0,
      metadata: { duration_ms: run.duration_ms, duplicates: run.duplicates, provider_status: snapshot.provider_status },
    }).select('id').single());

    const newsRows = snapshot.items.map(item => {
      const contentHash = hashOf(item), target = normalizeUrl(item.normalized_url || item.url);
      return {
        title: item.title, description: item.description || item.snippet || null, url: target || item.url,
        canonical_url: target || item.url, source_name: item.source_name || null, source_domain: domainOf(target || item.url),
        published_at: item.published_at || null, discovered_at: item.discovered_at || new Date().toISOString(), image_url: item.image_url || null,
        search_term: item.search_query || null, content_hash: contentHash, relevance_score: item.relevance_score || 0,
        relevance_status: item.relevance_status || 'manual_review', relevance_reason: item.relevance_reason || null,
        analysis_source: item.analysis_source || 'metadata', matched_entities: item.matched_entities || [],
        aggregator_url: item.provider === 'google_news_rss' ? item.url : null,
        original_url: item.provider === 'google_news_rss' ? null : item.url,
        published_date_source: item.published_date_source || (item.published_at ? 'provider' : 'unconfirmed'),
        published_date_confirmed: Boolean(item.published_at), provider: item.provider || item.providers?.[0] || null,
      };
    });
    if (newsRows.length) assertDb(await db.from('news').upsert(newsRows, { onConflict: 'content_hash', ignoreDuplicates: true }));
    const current = assertDb(await db.from('monitor_runs').select('news_new').eq('id', runRow.id).single());
    assertDb(await db.from('monitor_runs').update({ news_new: current?.news_new || 0 }).eq('id', runRow.id));

    const queryRows = (run.query_runs || []).map(item => ({
      monitor_run_id: runRow.id, provider: item.provider, query_text: item.query || null,
      status: item.status === 'failed' ? 'error' : item.status, started_at: run.started_at, finished_at: run.finished_at,
      results_count: item.results_found || 0, error_message: item.message || null,
    }));
    if (queryRows.length) assertDb(await db.from('query_runs').insert(queryRows));
    snapshot.run.database_id = runRow.id;
  }
}
