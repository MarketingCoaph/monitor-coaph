import { fetchWithTimeout } from '../utils/fetch.js';
import { parseRss } from '../rss.js';
import { domainOf } from '../utils/url.js';

const FALLBACK_TERMS = [
  'COAPH',
  '"Operação Cooptação"',
  '"Operação Coaptação"',
  '"Newton Lacerda"',
  '"José Newton Lacerda"',
  '"Montezuma Feitosa"',
];

export function siteSearchFeed(source) {
  const domain = domainOf(source.url).replace(/^www\./, '');
  if (!domain) throw new Error(`Fonte sem domínio válido: ${source.url}`);
  const query = `site:${domain} (${FALLBACK_TERMS.join(' OR ')}) after:2026-10-07`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
}

export class DirectRSSProvider {
  name = 'direct_rss';
  async search(source) {
    try {
      const response = await fetchWithTimeout(source.url);
      const items = parseRss(await response.text(), { provider: this.name, sourceName: source.name });
      if (items.length) return items;
    } catch {
      // Portais frequentemente bloqueiam robôs ou recebem uma URL HTML no cadastro.
      // A busca restrita ao domínio mantém essas fontes monitoradas sem raspar o site.
    }

    const fallbackResponse = await fetchWithTimeout(siteSearchFeed(source));
    return parseRss(await fallbackResponse.text(), { provider: this.name, sourceName: source.name });
  }
}
