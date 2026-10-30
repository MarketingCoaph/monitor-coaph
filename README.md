# Monitor de Notícias COAPH

Painel React/Vite com funções serverless no Vercel e banco PostgreSQL no Supabase. O monitor consulta Google Notícias RSS, feeds diretos e Serper, classifica os resultados e grava o histórico no Supabase.

## Arquitetura de produção

- Vercel: frontend, APIs em `api/*.js` e execução agendada.
- Supabase: notícias, termos, entidades, fontes, revisões e histórico das varreduras.
- Hostinger: cópia de contingência; não participa do funcionamento normal.
- O site oficial `coaph.com.br` e o repositório `coaphoficial` não fazem parte deste projeto.

## Variáveis no Vercel

Cadastre em Project Settings > Environment Variables (Production, Preview e Development):

```text
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=CHAVE_SERVICE_ROLE
SERPER_API_KEY=CHAVE_SERPER
CRON_SECRET=SEGREDO_LONGO_E_ALEATORIO
MONITOR_START_DATE=2026-10-08
```

Nunca use o prefixo `VITE_` na chave `service_role`: ela só pode existir no servidor.

## Desenvolvimento local

1. Execute `npm install`.
2. Preencha `.env` com as mesmas variáveis.
3. Use `npm run dev` para o frontend e `npm run monitor:test` para testar as fontes.
4. Use `npm run build` antes de publicar.

O plugin local do Vite continua disponível como diagnóstico. As funções do Vercel são a API oficial de produção.

## Banco

As migrações versionadas ficam em `supabase/migrations/`. Todas as tabelas públicas usam RLS e não concedem acesso a `anon` nem `authenticated`; somente as funções serverless, com `service_role`, acessam o banco.

O script `scripts/migrate-hostinger-to-supabase.js` existe apenas para uma eventual nova sincronização de contingência. Ele lê a API antiga e nunca contém credenciais.

## Publicação

O repositório correto é `MarketingCoaph/monitor-coaph`. Um push na branch configurada no projeto Vercel inicia a implantação automática. Antes de considerar a migração concluída, confirme `/api/dashboard` e `/api/news` no domínio do Vercel.
