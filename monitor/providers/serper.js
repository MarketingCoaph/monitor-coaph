import crypto from 'node:crypto';
import { fetchWithTimeout } from '../utils/fetch.js';
import { normalizeUrl, domainOf } from '../utils/url.js';
import { publicationDate, collectedAt } from '../utils/date.js';

export class SerperProvider {
  name = 'serper';
  constructor(apiKey) { this.apiKey = apiKey; }
  get enabled() { return Boolean(this.apiKey); }
  async search(query) {
    if (!this.enabled) return [];
    const compatibleQuery = query.query.replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
    const response = await fetchWithTimeout('https://google.serper.dev/news', {
      method: 'POST',
      headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: compatibleQuery, gl: 'br', hl: 'pt-br', num: 20, tbs: 'qdr:w' }),
    });
    const payload = await response.json();
    return (payload.news || payload.organic || []).map((item, index) => {
      const url = item.link || item.url || '';
      const normalizedUrl = normalizeUrl(url);
      return {
        candidate_id: crypto.createHash('sha1').update(`${this.name}|${normalizedUrl}|${item.title}`).digest('hex'),
        title: item.title || '', url, normalized_url: normalizedUrl,
        snippet: item.snippet || '', source_name: item.source || domainOf(url), source_domain: domainOf(url),
        published_at: publicationDate(item.date), published_date_source: item.date ? 'serper' : 'unconfirmed',
        discovered_at: collectedAt(), provider: this.name, search_query: query.query, provider_query: compatibleQuery, query_id: query.id,
        result_position: item.position || index + 1, raw_data: item, processing_status: 'pending',
      };
    }).filter(item => item.title && item.url);
  }
}
