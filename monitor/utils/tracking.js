import { MONITOR_START_DATE } from '../config.js';

const genericTermWords = new Set(
  'a as o os um uma de da do das dos e ou para por com em no na nos nas sobre que saude hospital medico medica investigacao investigacoes investigar policia federal pf cgu operacao operacoes desvio desvios fraude fraudes lavagem dinheiro recurso recursos publico publicos ceara cearense fortaleza preso prisao prisoes mandado mandados apreensao imovel imoveis organizacao criminosa mil reais empresa empresas r'.split(' '),
);

const ignoredEntities = new Set(['pf', 'cgu', 'policia federal', 'controladoria geral da uniao']);

export function normalizedMatchText(value) {
  return ` ${String(value || '').toLocaleLowerCase('pt-BR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

export function isTrackedNews(news, tracking = {}) {
  const publishedDate = String(news.published_at || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedDate) || publishedDate < MONITOR_START_DATE) return false;

  const text = normalizedMatchText(`${news.title || ''} ${news.description || ''} ${news.content_excerpt || ''}`);
  const termMatch = (tracking.terms || []).some(term => {
    const normalizedTerm = normalizedMatchText(term);
    const words = [...new Set(normalizedTerm.trim().split(/\s+/)
      .filter(word => word && !/^\d+$/.test(word) && !genericTermWords.has(word)))];
    if (words.length) return words.every(word => text.includes(` ${word} `));
    return /\b\d+\b/.test(normalizedTerm) && text.includes(normalizedTerm);
  });
  const entityMatch = (tracking.entities || []).some(entity => {
    const name = normalizedMatchText(entity.name).trim();
    return name && !ignoredEntities.has(name) && text.includes(` ${name} `);
  });

  // Algumas reportagens descrevem a mesma operação sem repetir COAPH ou os
  // nomes dos investigados no título/resumo. Exigimos uma combinação forte de
  // sinais para preservar essas matérias sem abrir o painel para notícias
  // genéricas de saúde ou segurança pública.
  const has = pattern => pattern.test(text);
  const caseContextMatch =
    has(/\bcoaptacao\b/) ||
    (has(/\bbunker\b/) && has(/\bdinheiro\b/) && has(/\b(?:saude|ceara|pf)\b/)) ||
    (has(/\bempresas? (?:fantasmas?|ficticias?)\b/) && has(/\b(?:saude|ceara|pf)\b/)) ||
    (has(/\b(?:desvio|desvios|fraude|lavagem)\b/) && has(/\bsaude\b/) && has(/\b(?:ceara|pf|cgu)\b/)) ||
    (has(/\boperacao\b/) && has(/\bpf\b|\bpolicia federal\b/) && has(/\bsaude\b/) && has(/\bceara\b/));

  return termMatch || entityMatch || caseContextMatch;
}
