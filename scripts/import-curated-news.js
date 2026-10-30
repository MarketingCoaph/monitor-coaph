import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { supabaseAdmin, assertDb } from '../api/_lib/supabase.js';
import { normalizeUrl, domainOf } from '../monitor/utils/url.js';
import { normalizeText } from '../monitor/utils/text.js';

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
  'cydade.net': 'Cydade',
  'diariodonordeste.verdesmares.com.br': 'Diário do Nordeste',
  'diario360.com.br': 'Diário 360 Notícias',
  'g1.globo.com': 'G1 Ceará',
  'gov.br': 'Governo Federal',
  'folhadedourados.com.br': 'Folha de Dourados',
  'imprensalivredoceara.com.br': 'Imprensa Livre do Ceará',
  'itaremadireto.com.br': 'Itarema Direto',
  'jusconsulta.com.br': 'JusConsulta',
  'liberdaderadiotv.com.br': 'Liberdade News',
  'mais.opovo.com.br': 'O POVO+',
  'mentesqueagem.com.br': 'Mentes que Agem',
  'msagoraurgentenews.com.br': 'MS Agora Urgente News',
  'nexoeconomico.com': 'Nexo Econômico',
  'newscariri.com.br': 'News Cariri',
  'nordeste7.com.br': 'Nordeste7',
  'novidadesmt.com.br': 'Novidades MT',
  'oestadoce.com.br': 'O Estado CE',
  'opovo.com.br': 'O POVO',
  'policiamentointeligente.com': 'Policiamento Inteligente',
  'primeiroaqui.jor.br': 'Primeiro Aqui',
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

function findArticleBody(value) {
  if (!value || typeof value !== 'object') return '';
  if (typeof value.articleBody === 'string') return value.articleBody;
  for (const child of Object.values(value)) {
    const found = Array.isArray(child)
      ? child.map(findArticleBody).find(Boolean)
      : findArticleBody(child);
    if (found) return found;
  }
  return '';
}

function pageBody(html) {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const body = findArticleBody(JSON.parse(match[1]));
      if (body) return decode(body);
    } catch {}
  }
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  return article ? decode(article.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')) : '';
}

function mentionedPeople(text, people) {
  const normalized = ` ${normalizeText(text)} `;
  return [...new Set(people.filter(person => normalized.includes(` ${normalizeText(person)} `)))];
}

async function pageMetadata(entry, people) {
  try {
    const response = await fetch(entry.url, {
      redirect: 'follow', signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Monitor-COAPH/1.0)' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const body = pageBody(html);
    const candidateTitle = meta(html, 'og:title') || meta(html, 'twitter:title')
      || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    const blocked = /just a moment|attention required|access denied/i.test(candidateTitle);
    return {
      title: blocked ? titleFromUrl(entry.url) : candidateTitle || titleFromUrl(entry.url),
      description: meta(html, 'og:description') || meta(html, 'description') || null,
      image_url: meta(html, 'og:image') || null,
      content_excerpt: body ? body.slice(0, 12000) : null,
      matched_entities: ['COAPH', ...mentionedPeople(body, people)],
      analysis_source: body ? 'full_content' : 'metadata',
    };
  } catch {
    return { title: titleFromUrl(entry.url), description: null, image_url: null, content_excerpt: null, matched_entities: ['COAPH'], analysis_source: 'metadata' };
  }
}

export async function importCuratedNews() {
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const result = { skipped: true, reason: 'ambiente sem credenciais' };
  console.log('Curadoria manual: ambiente sem credenciais; importação ignorada.');
  return result;
}

const curatedInput = JSON.parse(await fs.readFile(new URL('../data/curated-news.json', import.meta.url), 'utf8'));
const instagramGroups = JSON.parse(await fs.readFile(new URL('../data/instagram-posts-2026-10.json', import.meta.url), 'utf8'));
const instagramInput = Object.entries(instagramGroups).flatMap(([date, urls]) => urls.map(url => ({
  url, published_at: `${date}T12:00:00-03:00`, provider: 'instagram', source_name: 'Instagram',
  title: url.includes('/p/') ? 'Publicação no Instagram' : 'Reel no Instagram',
})));
const input = [...curatedInput, ...instagramInput];
const entries = [...new Map(input.map(entry => {
  const url = normalizeUrl(entry.url);
  return [url, { ...entry, url }];
})).values()];
const db = supabaseAdmin();
const entityRows = assertDb(await db.from('case_entities').select('name,type').eq('active', 1)) || [];
const people = [...new Set([...entityRows.filter(row => normalizeText(row.type) === 'pessoa').map(row => row.name), 'Lúcio Domingos Cesar'])];
const stored = assertDb(await db.from('news').select('id,url,canonical_url,analysis_source').limit(5000)) || [];
const byUrl = new Map();
for (const row of stored) {
  for (const value of [row.url, row.canonical_url].filter(Boolean)) byUrl.set(normalizeUrl(value), row);
}
for (const entry of entries) {
  const replaced = entry.replace_url && byUrl.get(normalizeUrl(entry.replace_url));
  if (replaced) byUrl.set(entry.url, replaced);
}

const existing = entries.filter(entry => byUrl.has(entry.url));
const pending = entries.filter(entry => !byUrl.has(entry.url));
const enrichment = new Map();
const toEnrich = existing.filter(entry => byUrl.get(entry.url).analysis_source !== 'full_content');
for (let index = 0; index < toEnrich.length; index += 8) {
  const batch = toEnrich.slice(index, index + 8);
  for (const item of await Promise.all(batch.map(async entry => [entry.url, await pageMetadata(entry, people)]))) enrichment.set(...item);
}
for (const entry of existing) {
  const matchingRows = stored.filter(row => [row.url, row.canonical_url]
    .filter(Boolean).some(value => normalizeUrl(value) === entry.url));
  const replaced = entry.replace_url && byUrl.get(normalizeUrl(entry.replace_url));
  const rowsToUpdate = [...new Map([...matchingRows, replaced].filter(Boolean).map(row => [row.id, row])).values()];
  for (const row of rowsToUpdate) {
    assertDb(await db.from('news').update({
      url: entry.url, canonical_url: entry.url, original_url: entry.url, published_at: entry.published_at,
      manual_reviewed: 1, relevance_status: 'related', relevance_score: 100,
      relevance_reason: entry.provider==='instagram'?'Publicação do Instagram selecionada manualmente.':'Matéria selecionada manualmente para o levantamento da COAPH.',
      provider: entry.provider||'manual', category: entry.provider==='instagram'?'Instagram':'Curadoria manual',
      ...(enrichment.get(entry.url) || {}),
      ...(entry.source_name?{source_name:entry.source_name}:{}),
      ...(entry.title?{title:entry.title}:{}), ...(entry.description?{description:entry.description}:{}),
    }).eq('id', row.id));
  }
}

const enriched = [];
for (let index = 0; index < pending.length; index += 8) {
  const batch = pending.slice(index, index + 8);
  enriched.push(...await Promise.all(batch.map(async entry => {const metadata=await pageMetadata(entry,people);return {...entry,...metadata,title:entry.title||metadata.title,description:entry.description||metadata.description}})));
}
const now = new Date().toISOString();
const rows = enriched.map(entry => {
  const domain = domainOf(entry.url);
  return {
    title: entry.title, description: entry.description, content_excerpt: entry.content_excerpt, url: entry.url, canonical_url: entry.url,
    source_name: entry.source_name || sourceNames[domain] || domain, source_domain: domain,
    published_at: entry.published_at, discovered_at: now, image_url: entry.image_url,
    status: 'active', is_new: 1, is_read: 0, category: entry.provider==='instagram'?'Instagram':'Curadoria manual', search_term: 'COAPH',
    content_hash: crypto.createHash('sha256').update(`manual|${entry.url}`).digest('hex'),
    relevance_score: 100, relevance_status: 'related',
    relevance_reason: entry.provider==='instagram'?'Publicação do Instagram selecionada manualmente.':'Matéria selecionada manualmente para o levantamento da COAPH.',
    analysis_source: entry.analysis_source, matched_entities: entry.matched_entities, manual_reviewed: 1,
    original_url: entry.url, published_date_source: 'manual', published_date_confirmed: true,
    provider: entry.provider||'manual',
  };
});
if (rows.length) assertDb(await db.from('news').upsert(rows, { onConflict: 'content_hash', ignoreDuplicates: true }));
for (const entry of entries.filter(item => item.provider !== 'instagram')) {
  const overrides = {
    published_at: entry.published_at,
    published_date_source: 'manual',
    published_date_confirmed: true,
    manual_reviewed: 1,
    ...(entry.source_name ? { source_name: entry.source_name } : {}),
    ...(entry.title ? { title: entry.title } : {}),
    ...(entry.description ? { description: entry.description } : {}),
  };
  assertDb(await db.from('news').update(overrides).eq('canonical_url', entry.url));
  assertDb(await db.from('news').update(overrides).eq('url', entry.url));
}
const result = { existing: existing.length, inserted: rows.length, unique: entries.length, instagram: entries.filter(entry => entry.provider === 'instagram').length };
console.log(`Curadoria manual: ${result.existing} existentes atualizadas; ${result.inserted} novas inseridas; ${result.unique} URLs únicas (${result.instagram} do Instagram).`);
return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await importCuratedNews();
