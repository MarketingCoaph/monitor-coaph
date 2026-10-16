import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { supabaseAdmin, assertDb } from '../api/_lib/supabase.js';
import { normalizeUrl, domainOf } from '../monitor/utils/url.js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('Curadoria manual: ambiente sem credenciais; importação ignorada.');
  process.exit(0);
}

const sourceNames = {
  'agorario.com.br': 'Agora Rio',
  'avozdesantaquiteria.com.br': 'A Voz de Santa Quitéria',
  'blogdoevandomoreira.com': 'Blog do Evando Moreira',
  'blogdoeliomar.com': 'Blog do Eliomar',
  'blogdorogeriogomes.com.br': 'Blog do Rogério Gomes',
  'blogmucamboemquestao.com': 'Mucambo em Questão',
  'cearaantenado.com.br': 'Ceará Antenado',
  'cn7.com.br': 'CN7',
  'coxinhanews.com.br': 'Coxinha News',
  'diariodonordeste.verdesmares.com.br': 'Diário do Nordeste',
  'diario360.com.br': 'Diário 360 Notícias',
  'g1.globo.com': 'G1 Ceará',
  'gov.br': 'Governo Federal',
  'itaremadireto.com.br': 'Itarema Direto',
  'jusconsulta.com.br': 'JusConsulta',
  'liberdaderadiotv.com.br': 'Liberdade News',
  'mais.opovo.com.br': 'O POVO+',
  'msagoraurgentenews.com.br': 'MS Agora Urgente News',
  'nexoeconomico.com': 'Nexo Econômico',
  'nordeste7.com.br': 'Nordeste7',
  'novidadesmt.com.br': 'Novidades MT',
  'oestadoce.com.br': 'O Estado CE',
  'opovo.com.br': 'O POVO',
  'policiamentointeligente.com': 'Policiamento Inteligente',
  'portalalemdanoticia.com': 'Além da Notícia',
  'portalcearaonline.com.br': 'Portal Ceará Online',
  'portalterradaluz.com.br': 'Portal Terra da Luz',
  'rapaduradigital.com.br': 'Rapadura Digital',
  'reporterceara.com.br': 'Repórter Ceará',
  'sindsaudeceara.org.br': 'Sindsaúde Ceará',
  'timesbrasil.com.br': 'Times Brasil | CNBC',
  'trilhaeconomica.com': 'Trilha Econômica',
  'tvefm.com': 'TV & FM',
  'ultranoticias.com.br': 'Ultra Notícias',
};

const decode = value => String(value || '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replace(/\s+/g, ' ').trim();

function meta(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'),
  ];
  return decode(patterns.map(pattern => html.match(pattern)?.[1]).find(Boolean));
}

function titleFromUrl(url) {
  const part = new URL(url).pathname.split('/').filter(Boolean).at(-1) || domainOf(url);
  return decodeURIComponent(part).replace(/\.(?:html?|ghtml)$/i, '').replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toLocaleUpperCase('pt-BR'));
}

async function pageMetadata(entry) {
  try {
    const response = await fetch(entry.url, {
      redirect: 'follow', signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Monitor-COAPH/1.0)' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const candidateTitle = meta(html, 'og:title') || meta(html, 'twitter:title')
      || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    const blocked = /just a moment|attention required|access denied/i.test(candidateTitle);
    return {
      title: blocked ? titleFromUrl(entry.url) : candidateTitle || titleFromUrl(entry.url),
      description: meta(html, 'og:description') || meta(html, 'description') || null,
      image_url: meta(html, 'og:image') || null,
    };
  } catch {
    return { title: titleFromUrl(entry.url), description: null, image_url: null };
  }
}

const input = JSON.parse(await fs.readFile(new URL('../data/curated-news.json', import.meta.url), 'utf8'));
const entries = [...new Map(input.map(entry => {
  const url = normalizeUrl(entry.url);
  return [url, { ...entry, url }];
})).values()];
const db = supabaseAdmin();
const stored = assertDb(await db.from('news').select('id,url,canonical_url').limit(5000)) || [];
const byUrl = new Map();
for (const row of stored) {
  for (const value of [row.url, row.canonical_url].filter(Boolean)) byUrl.set(normalizeUrl(value), row);
}

const existing = entries.filter(entry => byUrl.has(entry.url));
const pending = entries.filter(entry => !byUrl.has(entry.url));
for (const entry of existing) {
  const row = byUrl.get(entry.url);
  assertDb(await db.from('news').update({
    manual_reviewed: 1, relevance_status: 'related', relevance_score: 100,
    relevance_reason: 'Matéria selecionada manualmente para o levantamento da COAPH.', provider: 'manual',
  }).eq('id', row.id));
}

const enriched = [];
for (let index = 0; index < pending.length; index += 8) {
  const batch = pending.slice(index, index + 8);
  enriched.push(...await Promise.all(batch.map(async entry => ({ ...entry, ...await pageMetadata(entry) }))));
}
const now = new Date().toISOString();
const rows = enriched.map(entry => {
  const domain = domainOf(entry.url);
  return {
    title: entry.title, description: entry.description, url: entry.url, canonical_url: entry.url,
    source_name: sourceNames[domain] || domain, source_domain: domain,
    published_at: entry.published_at, discovered_at: now, image_url: entry.image_url,
    status: 'active', is_new: 1, is_read: 0, category: 'Curadoria manual', search_term: 'COAPH',
    content_hash: crypto.createHash('sha256').update(`manual|${entry.url}`).digest('hex'),
    relevance_score: 100, relevance_status: 'related',
    relevance_reason: 'Matéria selecionada manualmente para o levantamento da COAPH.',
    analysis_source: 'metadata', matched_entities: ['COAPH'], manual_reviewed: 1,
    original_url: entry.url, published_date_source: 'manual', published_date_confirmed: true,
    provider: 'manual',
  };
});
if (rows.length) assertDb(await db.from('news').upsert(rows, { onConflict: 'content_hash', ignoreDuplicates: true }));
console.log(`Curadoria manual: ${existing.length} existentes atualizadas; ${rows.length} novas inseridas; ${entries.length} URLs únicas.`);
