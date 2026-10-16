import { fetchWithTimeout } from '../utils/fetch.js';
import { parseRss } from '../rss.js';

export class GoogleNewsRSSProvider {
  name = 'google_news_rss';
  async search(query) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query.query} after:2026-10-07`)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    const response = await fetchWithTimeout(url);
    return parseRss(await response.text(), { provider: this.name, query: query.query, queryId: query.id });
  }
}
