import { fetchWithTimeout } from '../utils/fetch.js';
import { parseRss } from '../rss.js';

export class DirectRSSProvider {
  name = 'direct_rss';
  async search(source) {
    const response = await fetchWithTimeout(source.url);
    return parseRss(await response.text(), { provider: this.name, sourceName: source.name });
  }
}
