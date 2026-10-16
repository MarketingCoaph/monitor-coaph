import { MonitorPipeline } from '../monitor/pipeline.js';
import { loadEnvFile } from '../monitor/utils/env.js';

await loadEnvFile();
const pipeline = new MonitorPipeline({ serperApiKey: process.env.SERPER_API_KEY || '' });
const result = await pipeline.run({ force: true });
const { run } = result;
console.log('\nMONITOR COAPH — TESTE REAL');
console.table({
  'Google News — requisições': run.google_news_requests,
  'Serper — requisições': run.serper_requests,
  'RSS direto — requisições': run.rss_requests,
  'Resultados brutos': run.total_results,
  'Candidatos únicos': run.unique_candidates,
  'Duplicados': run.duplicates,
  'Relacionados': run.related,
  'Revisão/Possíveis': run.possibly_related,
  'Descartados': run.unrelated,
  'Erros isolados': run.errors.length,
  'Duração (ms)': run.duration_ms,
});
console.log('\nSTATUS DOS PROVEDORES');
console.table(result.provider_status);
console.log('\nMATÉRIAS RELACIONADAS MAIS RECENTES');
console.table(result.items.filter(x => x.relevance_status === 'related').slice(0, 20).map(x => ({
  data: x.published_at?.slice(0, 10) || 'não confirmada', portal: x.source_name,
  titulo: x.title, provedores: x.providers.join(', '), queries: x.matched_queries.join(' | '), score: x.relevance_score,
})));
if (run.errors.length) { console.log('\nERROS (não interromperam a execução)'); console.table(run.errors); }
