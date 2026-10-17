import crypto from 'node:crypto';
import { decodeXml } from './utils/text.js';
import { normalizeUrl, domainOf } from './utils/url.js';
import { publicationDate, collectedAt } from './utils/date.js';

const tag = (xml, name) => decodeXml(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1]);
const attr = (xml, name, attribute) => decodeXml(xml.match(new RegExp(`<${name}[^>]*\\s${attribute}="([^"]*)"`, 'i'))?.[1]);

export function parseRss(xml, context = {}) {
  const rssItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match => match[1]);
  const atomItems = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(match => match[1]);
  return [...rssItems, ...atomItems].map(item => {
    const rawTitle = tag(item, 'title');
    const feedSource = tag(item, 'source');
    const title = feedSource && rawTitle.endsWith(` - ${feedSource}`) ? rawTitle.slice(0, -(feedSource.length + 3)) : rawTitle;
    const url = tag(item, 'link') || attr(item, 'link', 'href');
    const rawDate = tag(item, 'pubDate') || tag(item, 'published') || tag(item, 'updated');
    const normalizedUrl = normalizeUrl(url);
    return {
      candidate_id: crypto.createHash('sha1').update(`${context.provider}|${normalizedUrl}|${title}`).digest('hex'),
      title, url, normalized_url: normalizedUrl,
      snippet: tag(item, 'description') || tag(item, 'summary') || tag(item, 'content'),
      source_name: feedSource || context.sourceName || 'Fonte não identificada',
      source_domain: attr(item, 'source', 'url') || domainOf(url),
      published_at: publicationDate(rawDate),
      published_date_source: rawDate ? 'feed' : 'unconfirmed',
      discovered_at: collectedAt(), provider: context.provider,
      search_query: context.query || null, query_id: context.queryId || null,
      raw_data: { raw_date: rawDate || null }, processing_status: 'pending',
    };
  }).filter(item => item.title && item.url);
}
