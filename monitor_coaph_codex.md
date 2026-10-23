# Monitor de Notícias COAPH — Prompt Completo para Codex

Quero que você desenvolva um sistema web completo para monitoramento de notícias relacionadas à COAPH e à investigação que envolve a cooperativa e pessoas ligadas ao caso.

O sistema deve funcionar em hospedagem Hostinger, sem Supabase, Firebase ou qualquer outro backend externo obrigatório.

## Stack obrigatória

### Frontend
- React
- Vite
- Tailwind CSS

### Backend
- PHP

### Banco
- MySQL da própria Hostinger

### Hospedagem
- Hostinger

O projeto deve funcionar em hospedagem compartilhada convencional da Hostinger.

Não utilizar:
- Supabase
- Firebase
- backend Node.js rodando permanentemente
- dependências que exijam servidor Node ativo em produção

O React deve ser compilado com Vite e publicado como arquivos estáticos.

O backend deve funcionar através de endpoints PHP.

O banco deve ser MySQL.

## Objetivo do sistema

Criar um painel privado para monitorar automaticamente novas notícias relacionadas à COAPH e ao mesmo contexto investigativo atualmente acompanhado.

O sistema deve:

- pesquisar periodicamente novas matérias
- identificar notícias potencialmente relacionadas
- analisar o contexto da matéria
- descartar resultados irrelevantes
- armazenar notícias relevantes
- sinalizar matérias novas
- permitir revisão manual
- manter histórico de tudo que foi encontrado
- mostrar quando o monitor foi executado pela última vez

O sistema não deve considerar uma notícia relevante apenas porque encontrou uma palavra-chave.

É fundamental analisar se a matéria realmente pertence ao mesmo enredo investigativo.

## Termos monitorados iniciais

Cadastrar inicialmente:

- COAPH
- "COAPH investigação"
- "Coaph Investigação"
- "COAPH operação"
- "Cooperativa de Atendimento Pré e Hospitalar"
- "Cooperativa de Atendimento Pré e Hospitalar investigação"
- "José Newton Lacerda"
- "Jose Newton Lacerda"
- "Newton Lacerda"
- "Montezuma Feitosa"
- "Investigação Saúde"

O sistema deve permitir adicionar, editar, ativar, desativar e excluir termos pelo painel.

## Contexto do caso

Criar uma configuração chamada:

`case_context`

Ela deve armazenar uma descrição atualizável do caso monitorado.

Descrição inicial:

> O sistema monitora notícias, reportagens, investigações, operações, decisões judiciais, manifestações oficiais, apurações, fatos novos e publicações relacionadas à COAPH — Cooperativa de Atendimento Pré e Hospitalar — e às pessoas, empresas, instituições, órgãos ou acontecimentos associados ao contexto investigativo atualmente acompanhado.

Esse contexto deve poder ser alterado futuramente pelo painel.

O sistema não deve ficar preso apenas aos termos cadastrados.

Os termos servem para descoberta.

A validação final deve utilizar contexto.

## Fontes de monitoramento

Criar arquitetura preparada para múltiplas fontes.

Inicialmente utilizar feeds RSS e fontes públicas compatíveis.

Preparar estrutura para:

- Google News RSS
- feeds RSS de portais jornalísticos
- APIs de notícias
- APIs de busca
- sites específicos
- novas fontes futuras

Não fazer scraping direto da página comum de resultados do Google.

Não criar robô que simule navegador no Google Search.

A preferência deve ser por:

- RSS
- APIs
- fontes públicas estruturadas

## Fluxo geral do monitoramento

O funcionamento esperado:

```text
Cron Job da Hostinger
→ executa script PHP
→ carrega termos ativos
→ consulta fontes ativas
→ encontra possíveis matérias
→ normaliza URLs
→ verifica duplicidade
→ coleta título, resumo e informações disponíveis
→ tenta obter conteúdo público da matéria quando permitido
→ identifica entidades
→ analisa contexto
→ calcula relevância
→ classifica a matéria
→ salva no banco
→ registra execução no histórico
→ dashboard React consulta API
→ novas notícias aparecem no painel
```

## Análise de relevância

Esse é um dos pontos mais importantes do sistema.

O sistema deverá analisar:

- título
- descrição
- snippet
- resumo do RSS
- texto disponível publicamente na página
- nomes citados
- instituições citadas
- órgãos citados
- contexto geral da matéria

O objetivo é descobrir se a notícia realmente pertence ao caso monitorado.

Exemplo:

Se uma notícia mencionar "Newton Lacerda", mas tratar de assunto completamente diferente, ela NÃO deve ser classificada como relacionada automaticamente.

Se uma notícia falar de "investigação na saúde", mas não tiver relação concreta com COAPH ou com o caso acompanhado, ela também não deve entrar automaticamente no feed principal.

## Sistema de pontuação

Criar:

`relevance_score`

Valor de 0 a 100.

Sugestão:

- 0 a 39: Não relacionada
- 40 a 69: Possivelmente relacionada
- 70 a 100: Relacionada

Criar:

`relevance_status`

Valores:

- `related`
- `possibly_related`
- `unrelated`
- `manual_review`

A pontuação deve considerar contexto e combinação de entidades.

Não utilizar apenas contagem de palavras.

Exemplos de sinais fortes:

- COAPH + investigação
- COAPH + operação
- COAPH + José Newton Lacerda
- COAPH + Newton Lacerda
- COAPH + Montezuma Feitosa
- Cooperativa de Atendimento Pré e Hospitalar + investigação
- Newton Lacerda + investigação + saúde
- Montezuma Feitosa + COAPH

Quanto maior a relação contextual, maior a pontuação.

## Palavras genéricas

Não considerar uma notícia relevante apenas porque contém palavras isoladas como:

- saúde
- investigação
- operação
- cooperativa
- hospital
- polícia
- justiça

Esses termos devem ter peso baixo quando aparecem sozinhos.

## Entidades do caso

Criar tabela:

`case_entities`

Campos:

- id
- name
- normalized_name
- type
- relevance_weight
- active
- notes
- created_at
- updated_at

Tipos possíveis:

- pessoa
- empresa
- cooperativa
- órgão público
- operação
- instituição
- local
- termo
- entidade jurídica

Cadastrar inicialmente:

- COAPH
- Cooperativa de Atendimento Pré e Hospitalar
- José Newton Lacerda
- Jose Newton Lacerda
- Newton Lacerda
- Montezuma Feitosa

Permitir cadastro de novas entidades pelo painel.

## Análise do conteúdo da matéria

Quando possível, tentar acessar o conteúdo público da página encontrada.

Extrair apenas o texto necessário para:

- classificação
- resumo
- identificação de entidades
- indexação

Evitar capturar:

- menus
- rodapé
- publicidade
- comentários
- conteúdo irrelevante

Se for possível analisar o corpo da matéria:

`analysis_source = full_content`

Se não for possível:

`analysis_source = metadata`

Nesse caso utilizar:

- título
- descrição
- snippet
- RSS
- fonte
- entidades encontradas

O sistema nunca deve afirmar que analisou a matéria completa se apenas recebeu metadados.

Adicionar campos:

- analysis_source
- relevance_score
- relevance_status
- relevance_reason
- matched_entities
- content_excerpt

## Relevance reason

Salvar uma explicação simples.

Exemplos:

> Alta relevância: a matéria menciona COAPH, José Newton Lacerda e investigação relacionada ao setor de saúde.

> Possivelmente relacionada: menciona Newton Lacerda e investigação, mas não há referência direta à COAPH.

> Baixa relevância: menciona Newton Lacerda em contexto diferente do caso monitorado.

## Revisão manual

Criar página:

`/revisao`

Ela deve mostrar principalmente matérias com:

- `possibly_related`
- `manual_review`

Mostrar:

- título
- veículo
- domínio
- data
- resumo
- score
- motivo
- entidades identificadas
- termo que encontrou a matéria
- link original

Botões:

- Confirmar relacionada
- Marcar como não relacionada
- Manter para revisão

Salvar a decisão manual no banco.

## Dashboard

Criar dashboard profissional, organizado e visualmente confortável.

Evitar interface pequena.

O dashboard deve mostrar:

- total de notícias
- notícias novas
- notícias encontradas hoje
- notícias dos últimos 7 dias
- notícias relacionadas
- matérias aguardando revisão
- matérias descartadas
- quantidade de fontes ativas
- quantidade de termos ativos
- última execução
- status do monitor

Criar também:

### Últimas notícias encontradas

Cada card deve mostrar:

- título
- veículo
- domínio
- data de publicação
- data de descoberta
- resumo
- termo de busca
- entidades encontradas
- relevância
- score
- categoria
- selo NOVA
- botão abrir matéria
- botão marcar como lida

## Seções do sistema

Criar rotas:

- `/`
- `/noticias`
- `/revisao`
- `/termos`
- `/entidades`
- `/fontes`
- `/monitoramento`
- `/configuracoes`

## Sidebar

Itens:

- Dashboard
- Notícias
- Revisar
- Termos monitorados
- Entidades
- Fontes
- Monitoramento
- Configurações

Adicionar badge em:

- Notícias
- Revisar

quando existirem itens novos.

## Página de notícias

Criar:

`/noticias`

Filtros:

- busca por título
- fonte
- categoria
- termo
- entidade
- período
- score mínimo
- relevância
- somente novas
- somente não lidas

Ordenações:

- mais recentes
- mais antigas
- maior relevância
- data de descoberta

Estados:

- Nova
- Não lida
- Lida

## Termos monitorados

Criar:

`/termos`

Permitir:

- adicionar
- editar
- excluir
- ativar
- desativar
- testar busca

Campos:

- termo
- peso
- ativo
- observação

## Entidades

Criar:

`/entidades`

Permitir:

- cadastrar entidade
- editar
- ativar
- desativar
- definir peso
- definir tipo
- adicionar observação

## Fontes

Criar:

`/fontes`

Permitir:

- cadastrar feed RSS
- editar
- excluir
- ativar
- desativar
- testar conexão
- mostrar última execução
- quantidade de notícias encontradas
- quantidade de erros

## Banco de dados

Criar arquivo:

`database.sql`

### Tabela `news`

Campos:

- id
- title
- description
- content_excerpt
- url
- canonical_url
- source_name
- source_domain
- published_at
- discovered_at
- image_url
- status
- is_new
- is_read
- category
- search_term
- content_hash
- relevance_score
- relevance_status
- relevance_reason
- analysis_source
- matched_entities
- manual_reviewed
- created_at
- updated_at

### Tabela `sources`

Campos:

- id
- name
- type
- url
- active
- last_checked_at
- created_at
- updated_at

### Tabela `search_terms`

Campos:

- id
- term
- weight
- active
- notes
- created_at
- updated_at

### Tabela `case_entities`

Campos:

- id
- name
- normalized_name
- type
- relevance_weight
- active
- notes
- created_at
- updated_at

### Tabela `monitor_logs`

Campos:

- id
- source_id
- search_term
- status
- total_results
- new_results
- related_results
- review_results
- discarded_results
- message
- executed_at

### Tabela `settings`

Campos:

- id
- setting_key
- setting_value

### Tabela `manual_reviews`

Campos:

- id
- news_id
- previous_status
- new_status
- notes
- reviewed_at

## Duplicidade

Criar sistema robusto.

Verificar:

- canonical_url
- URL normalizada
- content_hash
- título + domínio

Remover parâmetros como:

- utm_source
- utm_medium
- utm_campaign
- utm_content
- utm_term
- fbclid
- gclid

Também evitar duplicar uma mesma matéria distribuída por URLs ligeiramente diferentes.

## RSS

Criar parser compatível com:

- RSS 2.0
- Atom

Extrair quando disponível:

- título
- link
- descrição
- publicação
- fonte
- imagem
- autor

Se algum campo estiver ausente, o sistema não deve quebrar.

## Histórico

Criar:

`/monitoramento`

Mostrar:

- data e hora
- fonte
- termo
- quantidade encontrada
- quantidade nova
- relacionadas
- revisão
- descartadas
- erros
- status

## Status do monitor

Exibir:

**Monitor funcionando**

Última execução:

`XX/XX/XXXX às XX:XX`

Se passar muito tempo:

> Atenção: o monitor não executa uma busca há algum tempo.

Deixar o tempo configurável.

## Cron Job

Criar script:

`/api/cron/monitor-news.php`

Ele deve:

1. carregar configurações
2. carregar termos ativos
3. carregar fontes
4. consultar fontes
5. processar XML/RSS
6. normalizar URLs
7. verificar duplicidade
8. coletar conteúdo disponível
9. analisar entidades
10. calcular score
11. definir relevância
12. salvar notícia
13. registrar logs
14. atualizar horários

O cron deve poder rodar diretamente pela Hostinger.

## Segurança do Cron

Não deixar endpoint público desprotegido.

Utilizar:

`CRON_SECRET`

Se necessário chamar via URL:

`/api/cron/monitor-news.php?key=...`

Validar a chave.

Preferir execução por linha de comando sempre que possível.

## API

Criar endpoints organizados.

Exemplos:

```text
GET /api/dashboard.php

GET /api/news.php
GET /api/news.php?id=

PATCH /api/news-status.php

GET /api/review.php
POST /api/review-action.php

GET /api/sources.php
POST /api/sources.php
PUT /api/sources.php
DELETE /api/sources.php

GET /api/search-terms.php
POST /api/search-terms.php
PUT /api/search-terms.php
DELETE /api/search-terms.php

GET /api/entities.php
POST /api/entities.php
PUT /api/entities.php
DELETE /api/entities.php

GET /api/logs.php

GET /api/settings.php
PUT /api/settings.php
```

Padronizar JSON.

## Backend

Usar:

- PHP
- PDO
- MySQL

Todas as queries devem utilizar prepared statements.

Criar helpers para:

- banco
- respostas JSON
- normalização
- validação
- RSS
- relevância
- entidades
- URL
- logs

## Segurança

Não colocar credenciais no React.

Criar:

`config.example.php`

E:

`config.php`

Campos:

- DB_HOST
- DB_NAME
- DB_USER
- DB_PASSWORD
- CRON_SECRET

Adicionar `config.php` ao `.gitignore`.

Proteger contra:

- SQL Injection
- XSS
- CORS indevido
- endpoints administrativos expostos
- parâmetros inválidos

## Frontend

Criar organização:

```text
src/
components/
pages/
layouts/
services/
hooks/
utils/
```

Utilizar React Router.

Utilizar Lucide React.

## Design

Quero visual sério, moderno, profissional e limpo.

Não quero:

- letras pequenas
- dashboard comprimido
- elementos desalinhados
- ícones descentralizados
- excesso de sombras
- excesso de efeitos
- gradientes desnecessários
- visual genérico de template
- cards minúsculos

Utilizar:

- tipografia confortável
- boa hierarquia
- espaçamento consistente
- grids bem dimensionados
- largura de conteúdo adequada
- tabelas organizadas
- responsividade
- estados hover discretos
- cards com boa área interna

Quero uma estética semelhante a plataformas profissionais de monitoramento, inteligência e gestão de informação.

## Notificação na tela

Quando surgirem matérias novas, mostrar:

> X novas matérias encontradas

Adicionar badge.

Criar área:

### Novidades desde sua última visita

Não precisa implementar push notification inicialmente.

Mas deixar arquitetura preparada para:

- Web Push
- e-mail
- Telegram
- WhatsApp

## IA e classificação futura

Preparar arquitetura para futuramente integrar uma IA externa para análise semântica mais avançada.

Mas a primeira versão deve funcionar mesmo sem IA paga.

Criar a lógica inicial usando:

- entidades
- pesos
- combinações
- termos
- contexto
- regras de relevância

Caso futuramente seja adicionada uma API de IA, ela deverá complementar a classificação, não quebrar o sistema atual.

## Hostinger

Preparar para publicação assim:

```text
public_html/
index.html
assets/
.htaccess
api/
```

Criar `.htaccess` compatível com React Router.

Rotas como:

- `/noticias`
- `/revisao`
- `/fontes`
- `/termos`
- `/entidades`
- `/monitoramento`

devem funcionar ao atualizar a página.

Importante:

Não redirecionar chamadas de:

`/api`

para `index.html`.

## README

Criar `README.md` extremamente claro.

Explicar:

1. instalação local
2. npm install
3. npm run dev
4. configuração PHP
5. configuração MySQL
6. importação database.sql
7. configuração config.php
8. build React
9. npm run build
10. publicação na Hostinger
11. configuração .htaccess
12. configuração do Cron Job
13. configuração de RSS
14. testes
15. solução de problemas comuns

## Entregáveis

Ao final quero:

- frontend React completo
- Vite
- Tailwind
- React Router
- backend PHP
- MySQL
- database.sql
- dashboard
- feed de notícias
- sistema de revisão
- CRUD de termos
- CRUD de entidades
- CRUD de fontes
- parser RSS
- classificação de relevância
- prevenção de duplicidade
- histórico
- Cron Job
- API
- .htaccess
- config.example.php
- README
- .gitignore

## Importante sobre implementação

Antes de alterar qualquer coisa:

- analise a estrutura atual do projeto
- preserve arquivos úteis
- não sobrescreva código funcional sem necessidade

Se o projeto estiver vazio:

- monte toda a arquitetura do zero

Não quero apenas explicações.

Implemente o projeto.

Não utilize dados fictícios permanentes.

Mocks podem ser utilizados apenas durante desenvolvimento visual.

O sistema final deve ficar preparado para receber dados reais e funcionar na Hostinger.

## Prioridade principal

A prioridade principal não é encontrar o maior número possível de matérias.

A prioridade é encontrar matérias realmente relacionadas ao caso.

É melhor enviar uma notícia duvidosa para a aba **Revisar** do que classificá-la incorretamente como relacionada.
