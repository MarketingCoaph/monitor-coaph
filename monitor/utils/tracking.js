import { MONITOR_START_DATE } from '../config.js';

const ignoredEntities = new Set(['pf', 'cgu', 'policia federal', 'controladoria geral da uniao']);

export function normalizedMatchText(value) {
  return ` ${String(value || '').toLocaleLowerCase('pt-BR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

export function isTrackedNews(news, tracking = {}) {
  const publishedDate = String(news.published_at || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedDate) || publishedDate < MONITOR_START_DATE) return false;
  if (+news.manual_reviewed === 1 && news.provider === 'manual') return true;

  const text = normalizedMatchText(`${news.title || ''} ${news.description || ''} ${news.content_excerpt || ''}`);
  const entityMatch = (tracking.entities || []).some(entity => {
    const name = normalizedMatchText(entity.name).trim();
    return name && !ignoredEntities.has(name) && text.includes(` ${name} `);
  });
  return entityMatch;
}
