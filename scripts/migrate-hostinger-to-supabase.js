import { createClient } from '@supabase/supabase-js';

const base = process.env.LEGACY_API_URL || 'https://imprensas.coaph.com.br/api';
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function legacy(endpoint) {
  const response = await fetch(`${base}/${endpoint}`, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload.success) throw new Error(payload.message || `${endpoint}: resposta inválida`);
  return payload.data;
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return 0;
  const { error } = await db.from(table).upsert(rows, { onConflict, ignoreDuplicates: true });
  if (error) throw error;
  return rows.length;
}

const [newsPayload, terms, entities, sources, settings, logs] = await Promise.all([
  legacy('news.php'), legacy('search-terms.php'), legacy('entities.php'),
  legacy('sources.php'), legacy('settings.php'), legacy('logs.php'),
]);

const newsColumns = ['title','description','content_excerpt','url','canonical_url','source_name','source_domain','published_at','discovered_at','image_url','status','is_new','is_read','category','search_term','content_hash','relevance_score','relevance_status','relevance_reason','analysis_source','matched_entities','manual_reviewed','created_at','updated_at'];
const pick = (row, columns) => Object.fromEntries(columns.filter(column => row[column] !== undefined).map(column => [column, row[column]]));
const counts = {};
counts.news = await upsert('news', (newsPayload.items || []).map(row => pick(row, newsColumns)), 'content_hash');
counts.search_terms = await upsert('search_terms', terms.map(row => pick(row, ['term','weight','active','notes','created_at','updated_at'])), 'term');
counts.case_entities = await upsert('case_entities', entities.map(row => pick(row, ['name','normalized_name','type','relevance_weight','active','notes','created_at','updated_at'])), 'normalized_name,type');
counts.sources = await upsert('sources', sources.map(row => ({ ...pick(row, ['name','type','url','active','last_checked_at','created_at','updated_at']), provider: String(row.url || '').includes('news.google.') ? 'google_news_rss' : 'direct_rss' })), 'url');
counts.settings = await upsert('settings', Object.entries(settings).map(([setting_key, setting_value]) => ({ setting_key, setting_value: String(setting_value) })), 'setting_key');

const logRows = logs.map(row => pick(row, ['source_id','search_term','status','total_results','new_results','related_results','review_results','discarded_results','message','executed_at']));
const { error: logError } = logRows.length ? await db.from('monitor_logs').insert(logRows) : { error: null };
if (logError) console.warn(`Histórico legado não foi duplicado: ${logError.message}`);
else counts.monitor_logs = logRows.length;

console.log(JSON.stringify({ success: true, processed: counts }, null, 2));
