import assert from 'node:assert/strict';
import { isTrackedNews } from '../monitor/utils/tracking.js';

const news = title => ({ title, published_at: '2026-10-10T12:00:00-03:00' });

for (const title of [
  'Esquema milionário de desvio na saúde do CE tinha bunker de dinheiro e mais de 80 empresas',
  'PF investiga desvios de recursos da saúde no Ceará',
  'Operação Coaptação combate grupo suspeito de desvio de recursos',
  'Rede de empresas fantasmas na saúde do Ceará é investigada pela PF',
]) assert.equal(isTrackedNews(news(title)), true, title);

for (const title of [
  'Operação da PF combate fraude bancária em São Paulo',
  'Governo anuncia novos recursos para a saúde do Ceará',
  'Empresa abre vagas de emprego em Fortaleza',
]) assert.equal(isTrackedNews(news(title)), false, title);

console.log('tracking contextual: ok');
