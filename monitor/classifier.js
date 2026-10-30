import { ENTITY_RULES } from './config.js';
import { normalizeText } from './utils/text.js';

const GENERIC_SIGNALS = [
  ['Polícia Federal', /\bpolicia federal\b|\bpf\b/, 10], ['CGU', /\bcgu\b|controladoria geral da uniao/, 10],
  ['investigação', /investig/, 5], ['saúde', /saude|hospital|medic/, 3],
  ['desvio/fraude', /desvio|fraude|lavagem de dinheiro|organizacao criminosa/, 5],
];

export function classify(candidate) {
  const text = ` ${normalizeText(`${candidate.title} ${candidate.snippet}`)} `;
  const matchedEntities = [];
  let score = 0;
  for (const entity of ENTITY_RULES) {
    if (entity.aliases.some(alias => text.includes(` ${normalizeText(alias)} `))) {
      matchedEntities.push(entity.name); score += entity.weight;
    }
  }
  const signals = [];
  for (const [name, pattern, weight] of GENERIC_SIGNALS) if (pattern.test(text)) { signals.push(name); score += weight; }
  const principal = matchedEntities.filter(name => !['Polícia Federal', 'CGU'].includes(name));
  if (principal.length >= 2) score += 10;
  score = Math.min(100, score);
  let status = score >= 70 ? 'related' : score >= 40 ? 'possibly_related' : 'unrelated';
  if (!principal.length) status = score >= 40 ? 'manual_review' : 'unrelated';
  const reason = principal.length
    ? `${status === 'related' ? 'Alta relevância' : 'Possível relação'}: entidades identificadas: ${principal.join(', ')}${signals.length ? `; contexto: ${signals.join(', ')}` : ''}.`
    : `Descartada ou pendente de revisão: nenhuma entidade principal do caso foi identificada${signals.length ? `; apenas sinais genéricos: ${signals.join(', ')}` : ''}.`;
  return { relevance_score: score, relevance_status: status, relevance_reason: reason, matched_entities: matchedEntities, analysis_source: 'metadata' };
}
