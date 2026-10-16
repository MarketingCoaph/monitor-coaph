import crypto from 'node:crypto';
import { SEARCH_QUERIES, DIRECT_SOURCES, CACHE_TTL_MS, MAX_QUERIES_PER_RUN, MAX_SERPER_QUERIES_PER_RUN } from './config.js';
import { GoogleNewsRSSProvider } from './providers/googleNews.js';
import { DirectRSSProvider } from './providers/directRss.js';
import { SerperProvider } from './providers/serper.js';
import { normalizeTitle } from './utils/text.js';
import { normalizeUrl, domainOf } from './utils/url.js';
import { classify } from './classifier.js';
import { LocalCandidateStore } from './store/localStore.js';

export function candidateKey(candidate) {
  const normalized = normalizeUrl(candidate.normalized_url || candidate.url);
  if (normalized) {
    if (domainOf(normalized) === 'news.google.com') {
      const parsed = new URL(normalized);
      return `url:${parsed.hostname}${parsed.pathname.replace(/^\/rss\//, '/')}`;
    }
    return `url:${normalized}`;
  }
  return `fallback:${normalizeTitle(candidate.source_name)}|${normalizeTitle(candidate.title)}|${String(candidate.published_at || '').slice(0, 10)}`;
}

export class MonitorPipeline {
  constructor({ serperApiKey = '', store = new LocalCandidateStore(), loadConfig = null } = {}) {
    this.providers = { google: new GoogleNewsRSSProvider(), direct: new DirectRSSProvider(), serper: new SerperProvider(serperApiKey) };
    this.cache = null; this.running = null; this.history = []; this.store = store; this.loadConfig = loadConfig; this.serperOffset = 0;
  }

  async run({ force = false } = {}) {
    if (this.running) return this.running;
    if (!force && this.cache && Date.now() - this.cache.cachedAt < CACHE_TTL_MS) return this.cache;
    this.running = this.execute().finally(() => { this.running = null; });
    return this.running;
  }

  async execute() {
    const started = Date.now();
    const dynamic = this.loadConfig ? await this.loadConfig() : null;
    const queries = (dynamic?.queries?.length ? dynamic.queries : SEARCH_QUERIES).slice(0, MAX_QUERIES_PER_RUN);
    const directSources = dynamic?.sources?.length ? dynamic.sources : DIRECT_SOURCES;
    const jobs = [];
    for (const query of queries) {
      jobs.push({ provider: 'google_news_rss', query, promise: this.providers.google.search(query) });
    }
    if (this.providers.serper.enabled) {
      const eligible = queries;
      const selected = Array.from({ length: Math.min(MAX_SERPER_QUERIES_PER_RUN, eligible.length) }, (_, index) => eligible[(this.serperOffset + index) % eligible.length]);
      this.serperOffset = (this.serperOffset + selected.length) % eligible.length;
      let chain = Promise.resolve();
      for (const query of selected) {
        const promise = chain.then(() => this.providers.serper.search(query));
        chain = promise.catch(() => undefined);
        jobs.push({ provider: 'serper', query, promise });
      }
    }
    for (const source of directSources) jobs.push({ provider: 'direct_rss', source, promise: this.providers.direct.search(source) });
    const results = await Promise.allSettled(jobs.map(job => job.promise));
    const errors = [], queryRuns = [], candidates = [];
    results.forEach((result, index) => {
      const job = jobs[index];
      if (result.status === 'fulfilled') {
        candidates.push(...result.value);
        queryRuns.push({ provider: job.provider, query: job.query?.query || job.source?.url, results_found: result.value.length, status: 'success' });
      } else {
        const error = { provider: job.provider, query: job.query?.query || job.source?.url, message: result.reason?.message || String(result.reason) };
        errors.push(error); queryRuns.push({ ...error, results_found: 0, status: 'failed' });
      }
    });

    const unique = new Map(), duplicates = [];
    for (const candidate of candidates) {
      const key = candidateKey(candidate);
      const existing = unique.get(key);
      if (existing) {
        existing.matched_queries = [...new Set([...(existing.matched_queries || []), candidate.search_query].filter(Boolean))];
        existing.providers = [...new Set([...(existing.providers || [existing.provider]), candidate.provider])];
        duplicates.push(candidate); candidate.processing_status = 'duplicate';
      } else {
        const classified = classify(candidate);
        unique.set(key, { ...candidate, ...classified, id: `live-${crypto.createHash('sha1').update(key).digest('hex').slice(0, 16)}`, matched_queries: [candidate.search_query].filter(Boolean), providers: [candidate.provider], processing_status: 'processed', is_new: 1, live: true });
      }
    }
    const items = [...unique.values()].sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
    const run = {
      id: crypto.randomUUID(), started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(), status: errors.length ? 'warning' : 'success',
      google_news_requests: jobs.filter(x => x.provider === 'google_news_rss').length,
      serper_requests: jobs.filter(x => x.provider === 'serper').length,
      rss_requests: jobs.filter(x => x.provider === 'direct_rss').length,
      total_results: candidates.length, unique_candidates: items.length, duplicates: duplicates.length,
      related: items.filter(x => x.relevance_status === 'related').length,
      possibly_related: items.filter(x => x.relevance_status === 'possibly_related' || x.relevance_status === 'manual_review').length,
      unrelated: items.filter(x => x.relevance_status === 'unrelated').length,
      errors, duration_ms: Date.now() - started, query_runs: queryRuns,
    };
    this.history.unshift(run); this.history = this.history.slice(0, 20);
    this.cache = { cachedAt: Date.now(), items, candidates, duplicates, run, provider_status: { google_news_rss: 'active', direct_rss: 'active', serper: this.providers.serper.enabled ? 'active' : 'waiting_for_api_key' } };
    await this.store.save(this.cache);
    return this.cache;
  }

  status() { return { running: Boolean(this.running), last: this.cache?.run || null, provider_status: this.cache?.provider_status || { google_news_rss: 'ready', direct_rss: 'ready', serper: this.providers.serper.enabled ? 'ready' : 'waiting_for_api_key' }, history: this.history }; }
}
