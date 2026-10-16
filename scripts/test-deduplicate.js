import assert from 'node:assert/strict';
import { deduplicateNews } from '../monitor/utils/deduplicate.js';

const direct = { id: 1, title: 'Vereador nega ligação com COAPH', source_name: 'CN7', url: 'https://cn7.com.br/materia/', published_at: '2026-10-15T20:54:48', description: 'Texto completo' };
const google = { ...direct, id: 2, title: direct.title + ' - CN7', source_name: 'Google Notícias — COAPH', url: 'https://news.google.com/rss/articles/ABC?oc=5', description: 'Resumo' };
const legacy = { ...google, id: 3, url: 'https://news.google.com/articles/ABC?hl=pt-BR', published_at: '2026-10-15T17:54:00' };
assert.deepEqual(deduplicateNews([google, legacy, direct]).map(x => x.id), [1]);
assert.equal(deduplicateNews([google, legacy]).length, 1);
assert.equal(deduplicateNews([direct, { ...direct, url: direct.url + '?utm_source=feed#top' }]).length, 1);
assert.equal(deduplicateNews([direct, { ...direct, url: direct.url.replace('https:', 'http:') }]).length, 1);
const queryArticle = { ...direct, url: 'https://cn7.com.br/materia?id=10&pagina=2' };
assert.equal(deduplicateNews([queryArticle, { ...queryArticle, url: 'https://www.cn7.com.br/materia/?pagina=2&id=10&utm_source=feed' }]).length, 1);
const otherPortal = { ...direct, id: 4, source_name: 'News Ceará', url: 'https://newsceara.com/materia' };
assert.equal(deduplicateNews([direct, google, otherPortal]).length, 2);
const otherArticle = { ...direct, id: 5, url: 'https://cn7.com.br/outra-materia' };
assert.equal(deduplicateNews([direct, otherArticle, google]).length, 3);
assert.equal(deduplicateNews([{ ...google, title: 'Outra notícia - CN7', url: 'https://news.google.com/articles/XYZ' }, direct]).length, 2);
assert.equal(deduplicateNews([{ ...google, published_at: '2026-10-16' }, direct]).length, 2);
console.log('Deduplicação: 9 verificações passaram.');
