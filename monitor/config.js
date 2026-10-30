export const MONITOR_START_DATE = '2026-10-08';
export const CACHE_TTL_MS = 5 * 60_000;
export const REQUEST_TIMEOUT_MS = 12_000;
export const MAX_QUERIES_PER_RUN = 24;
export const MAX_SERPER_QUERIES_PER_RUN = 5;

export const SEARCH_QUERIES = [
  { id: 'coaph-investigacao', query: 'COAPH investigação', priority: 100 },
  { id: 'coaph-policia-federal', query: 'COAPH Polícia Federal', priority: 100 },
  { id: 'coaph-cgu', query: 'COAPH CGU', priority: 100 },
  { id: 'coaph-desvio', query: 'COAPH desvio', priority: 100 },
  { id: 'coaph-lavagem-dinheiro', query: 'COAPH lavagem de dinheiro', priority: 100 },
  { id: 'coaph-empresas-fantasmas', query: 'COAPH empresas fantasmas', priority: 100 },
  { id: 'operacao-coaptacao', query: 'Operação Coaptação', priority: 100 },
  { id: 'operacao-coaptacao-coaph', query: 'Operação Coaptação COAPH', priority: 100 },
  { id: 'operacao-coaptacao-pf', query: 'Operação Coaptação Polícia Federal', priority: 100 },
  { id: 'jose-newton-coaph', query: 'José Newton Lacerda COAPH', priority: 100 },
  { id: 'jose-newton-investigacao', query: 'José Newton Lacerda investigação', priority: 100 },
  { id: 'newton-lacerda-saude', query: 'Newton Lacerda saúde', priority: 100 },
  { id: 'montezuma-coaph', query: 'Montezuma Feitosa COAPH', priority: 100 },
  { id: 'montezuma-investigacao', query: 'Montezuma Feitosa investigação', priority: 100 },
  { id: 'coaph-ampla', query: 'COAPH', priority: 95 },
  { id: 'new-consultoria', query: 'New Consultoria e Assessoria', priority: 85 },
  { id: 'lucio-domingos', query: 'Lúcio Domingos Cesar', priority: 85 },
  { id: 'vereador-samba', query: 'vereador de Horizonte escola de samba', priority: 85 },
  { id: 'notas-frias', query: 'notas frias COAPH', priority: 85 },
  { id: 'empresas-fantasmas-contexto', query: 'empresas fantasmas saúde Ceará PF', priority: 80 },
  { id: 'sala-dinheiro', query: 'sala do dinheiro Ceará saúde', priority: 80 },
  { id: 'fernando-cavalcante', query: 'Fernando Antônio Rosa Cavalcante', priority: 75 },
  { id: 'cesar-agamenon', query: 'César Agamenon Carvalho Barbosa', priority: 75 },
].sort((a, b) => b.priority - a.priority);

export const DIRECT_SOURCES = [
  { id: 'cn7', name: 'CN7', url: 'https://cn7.com.br/feed/', priority: 100 },
  { id: 'news-ceara', name: 'News Ceará', url: 'https://newsceara.com/feed/', priority: 100 },
].sort((a, b) => b.priority - a.priority);

export const ENTITY_RULES = [
  { name: 'COAPH', weight: 40, aliases: ['coaph', 'cooperativa de atendimento pre e hospitalar', 'cooperativa de trabalho de atendimento pre e hospitalar'] },
  { name: 'Operação Coaptação', weight: 40, aliases: ['operacao coaptacao', 'coaptacao'] },
  { name: 'José Newton Lacerda', weight: 30, aliases: ['jose newton lacerda', 'newton lacerda', 'jose newton lacerda carneiro', 'newton lacerda carneiro'] },
  { name: 'Montezuma Feitosa Alexandrino', weight: 30, aliases: ['montezuma feitosa', 'montezuma feitosa alexandrino'] },
  { name: 'Fernando Antônio Rosa Cavalcante', weight: 25, aliases: ['fernando antonio rosa cavalcante'] },
  { name: 'César Agamenon Carvalho Barbosa', weight: 25, aliases: ['cesar agamenon carvalho barbosa'] },
  { name: 'Polícia Federal', weight: 10, aliases: ['policia federal', ' pf '] },
  { name: 'CGU', weight: 10, aliases: ['cgu', 'controladoria geral da uniao'] },
];
