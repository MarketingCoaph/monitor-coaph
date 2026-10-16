import assert from 'node:assert/strict';
import { isTrackedNews } from '../monitor/utils/tracking.js';

const tracking = { entities: [
  { name: 'COAPH' },
  { name: 'Cooperativa de Atendimento Pré e Hospitalar' },
  { name: 'Operação Coaptação' },
  { name: 'José Newton Lacerda' },
] };
const news = title => ({ title, published_at: '2026-10-10T12:00:00-03:00' });

for (const title of [
  'COAPH é alvo de operação da Polícia Federal',
  'Operação Coaptação combate grupo suspeito de desvio de recursos',
  'José Newton Lacerda é citado em investigação',
]) assert.equal(isTrackedNews(news(title), tracking), true, title);

for (const title of [
  'PF e CGU investigam suspeita de desvio de R$ 15,6 milhões na saúde em Sergipe',
  'PF realiza operação em Pedra Lavrada e Serra Branca para investigar suspeitas de fraude na saúde',
  'Operação da PF cumpre mandados na Paraíba e em mais quatro estados contra fraude na saúde',
  'Esquema milionário de desvio na saúde tinha bunker de dinheiro e mais de 80 empresas',
  'Operação da PF combate fraude bancária em São Paulo',
  'Governo anuncia novos recursos para a saúde do Ceará',
  'Empresa abre vagas de emprego em Fortaleza',
]) assert.equal(isTrackedNews(news(title), tracking), false, title);

console.log('tracking contextual: ok');
