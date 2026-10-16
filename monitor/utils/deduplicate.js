import { normalizeUrl, domainOf } from './url.js';
import { normalizeText } from './text.js';

function identity(item) {
  const urls = [item.original_url, item.canonical_url, item.url].filter(Boolean);
  const direct = urls.find(url => domainOf(url) && domainOf(url) !== 'news.google.com');
  const url = direct || urls[0];
  let title = String(item.title || '');
  let publisher = String(item.source_name || '');
  if (!direct) {
    const suffix = title.match(/\s+-\s+([^-]+)$/);
    if (suffix) {
      publisher = suffix[1];
      title = title.slice(0, suffix.index);
    }
  }
  if (/^google/i.test(publisher)) publisher = '';
  const normalizedPublisher = normalizeText(publisher);
  // Strip only the identified publisher, never arbitrary words from the headline.
  const normalizedTitle = normalizeText(title);
  const suffix = ` ${normalizedPublisher}`;
  const headline = normalizedPublisher && normalizedTitle.endsWith(suffix)
    ? normalizedTitle.slice(0, -suffix.length) : normalizedTitle;
  let urlKey = url ? normalizeUrl(url) : '';
  if (domainOf(url) === 'news.google.com') {
    const parsed = new URL(url);
    urlKey = `${parsed.hostname}${parsed.pathname.replace(/^\/rss\//, '/')}`;
  }
  return {
    urlKey, direct: Boolean(direct),
    story: headline && normalizedPublisher
      ? `${normalizedPublisher}|${headline}|${String(item.published_at || '').slice(0, 10)}` : '',
  };
}

/** Display deduplication only: preserve stored evidence and cross-portal republications. */
export function deduplicateNews(items) {
  const groups = [];
  const byUrl = new Map();
  for (const item of items) {
    const info = identity(item);
    let group = info.urlKey ? byUrl.get(info.urlKey) : undefined;
    if (!group) {
      group = { entries: [], stories: new Set(), direct: false };
      groups.push(group);
      if (info.urlKey) byUrl.set(info.urlKey, group);
    }
    group.entries.push({ item, info });
    if (info.story) group.stories.add(info.story);
    group.direct ||= info.direct;
  }
  // Only bridge an aggregator record to an unambiguous portal/headline/date match.
  // Two different direct article URLs must remain separate.
  const directGroups = groups.filter(group => group.direct);
  const removed = new Set();
  for (const group of groups.filter(group => !group.direct)) {
    const matches = directGroups.filter(target => [...group.stories].some(key => target.stories.has(key)));
    if (matches.length === 1) {
      matches[0].entries.push(...group.entries);
      removed.add(group);
    }
  }
  return groups.filter(group => !removed.has(group)).map(group => {
    const quality = ({ item, info }) => (info.direct ? 1e6 : 0)
      + Math.min(String(item.description || '').length, 10000);
    return group.entries.reduce((best, entry) => quality(entry) > quality(best) ? entry : best).item;
  }).sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}
