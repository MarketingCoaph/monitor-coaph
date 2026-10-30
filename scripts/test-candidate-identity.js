import assert from 'node:assert/strict';
import { candidateKey } from '../monitor/pipeline.js';

const base = { title: 'Mesmo texto republicado', published_at: '2026-10-10' };
const portalA = { ...base, source_name: 'Portal A', url: 'https://portala.com/noticia' };
const portalB = { ...base, source_name: 'Portal B', url: 'https://portalb.com/noticia' };
const googleA = { ...base, source_name: 'Portal A', url: 'https://news.google.com/rss/articles/AAA?oc=5' };
const googleB = { ...base, source_name: 'Portal B', url: 'https://news.google.com/rss/articles/BBB?oc=5' };

assert.notEqual(candidateKey(portalA), candidateKey(portalB));
assert.notEqual(candidateKey(googleA), candidateKey(googleB));
assert.equal(candidateKey(portalA), candidateKey({ ...portalA, url: portalA.url + '?utm_source=rss#top' }));
assert.equal(candidateKey(googleA), candidateKey({ ...googleA, url: 'https://news.google.com/articles/AAA?hl=pt-BR' }));

console.log('Identidade por URL/fonte: ok');
