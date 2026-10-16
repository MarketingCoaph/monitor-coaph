# Monitor de Notícias COAPH

## Supabase / PostgreSQL

A API suporta PostgreSQL (`DB_DRIVER=pgsql`) e mantém a configuração MySQL existente como alternativa.
O projeto Supabase `umpkqbganfxnqzjpfaof` recebeu as migrações `initialize_coaph_monitor` e
`restrict_internal_rls_trigger_execution`. As sete tabelas estão criadas com RLS ativado,
sem acesso pelas funções `anon` e `authenticated`. O acesso do painel ocorre pela API PHP.
`database.postgres.sql` contém a estrutura e os dados iniciais para instalar em um banco vazio;
não execute esse arquivo novamente no projeto já configurado.

Para completar a conexão da aplicação:

1. Use `api/config.supabase.example.php` como modelo de `api/config.php` (arquivo ignorado pelo Git).
2. Em Supabase → Connect → Session pooler, copie host, porta, banco e usuário para esse arquivo.
3. Preencha `DB_PASSWORD` localmente ou defina a variável de ambiente de mesmo nome.
   A chave publishable não substitui a senha PostgreSQL.
4. Ative `extension=pdo_pgsql` no PHP. No XAMPP desta máquina já foi ativada; reinicie o Apache para carregar a alteração.
5. Mantenha uma `CRON_SECRET` aleatória e não vazia. A configuração local já recebeu uma chave gerada.
6. Execute `npm ci` e `npm run dev`. O proxy local aponta para `http://localhost/monitor-coaph/api`.
   Para outro servidor, defina `API_PROXY_TARGET` antes de iniciar o Vite.
7. Teste `/monitor-coaph/api/dashboard.php` pelo Apache e depois execute `php api/cron/monitor-news.php`.

O SSL da conexão PostgreSQL usa `require`. Para verificar também o certificado e o hostname,
instale a CA do projeto no cliente PostgreSQL e use `DB_SSLMODE=verify-full` na configuração PHP.
Não há agendamento automático configurado: configure o cron da hospedagem após validar a conexão.
O RLS protege a Data API do Supabase; a autenticação do painel PHP continua sendo uma etapa separada antes de publicar.

Painel privado em React/Vite com API PHP, MySQL, monitor RSS, classificação contextual, fila de revisão e histórico. Em produção o frontend é estático; não é necessário manter Node.js em execução.

## Requisitos

- Node.js 20+ somente para desenvolvimento/build
- PHP 8.1+ com extensões PDO MySQL, cURL, SimpleXML e mbstring
- MySQL 8+ ou MariaDB 10.5+

## Instalação local (XAMPP)

1. No phpMyAdmin, importe `database.sql`.
2. Copie `api/config.example.php` para `api/config.php` e informe as credenciais locais e uma `CRON_SECRET` longa.
3. Execute `npm install`.
4. Inicie o Apache e o MySQL no XAMPP.
5. Para desenvolvimento, execute `npm run dev`. O Vite usa `/api` em `http://localhost:8080`; altere a porta em `vite.config.js` se o Apache usar outra.
6. Para simular produção, execute `npm run build` e copie o conteúdo de `dist/` para a raiz pública, mantendo a pasta `api/` ao lado de `index.html`.

## Monitor e cron

Teste pelo terminal:

```bash
php api/cron/monitor-news.php
```

Na Hostinger, prefira o cron por linha de comando:

```bash
/usr/bin/php /home/USUARIO/domains/DOMINIO/public_html/api/cron/monitor-news.php
```

Se precisar chamar por URL, use `https://DOMINIO/api/cron/monitor-news.php?key=SUA_CHAVE`. Sem a chave correta, a chamada HTTP é recusada. Uma frequência de 30 a 60 minutos costuma ser adequada.

## Publicação na Hostinger

1. Crie o banco e o usuário MySQL no painel da Hostinger.
2. Importe `database.sql` no phpMyAdmin da hospedagem.
3. Crie `api/config.php` a partir do exemplo com os dados reais.
4. Rode `npm run build` localmente.
5. Envie o conteúdo de `dist/`, `.htaccess` e a pasta `api/` para `public_html/`.
6. Não envie `node_modules`. Confirme PHP 8.1+ e as extensões exigidas.
7. Abra `/api/dashboard.php`: uma resposta JSON confirma a conexão. Depois abra o domínio.
8. Cadastre ou ajuste feeds na seção Fontes e configure o cron.

O `.htaccess` mantém as rotas do React ao atualizar a página e não redireciona `/api`.

## RSS e classificação

Feeds RSS 2.0 e Atom são aceitos. A fonte Google Notícias para COAPH já é criada pelo SQL. A classificação combina entidades, respectivos pesos, termos e sinais investigativos. Itens duvidosos seguem para Revisar; palavras genéricas isoladas recebem peso baixo. A análise informa `metadata` quando somente os dados do feed foram usados.

## Testes e diagnóstico

- `npm run build`: valida o frontend.
- `php -l arquivo.php`: valida sintaxe PHP.
- Erro 500 na API: confira `api/config.php`, credenciais, banco importado e extensões PHP.
- Tela sem dados: abra a aba Rede do navegador e teste `/api/dashboard.php`.
- Cron sem resultados: confira se cURL e SimpleXML estão ativos e se a origem permite acesso.
- Rotas retornando 404: habilite `mod_rewrite` e `AllowOverride All` no Apache.
- Para mensagens técnicas temporárias, defina `APP_ENV` como `development`; reverta para `production` ao publicar.

## Segurança

O `api/config.php` está ignorado pelo Git. Não inclua credenciais no React. As operações usam prepared statements. Para um painel verdadeiramente privado na internet, também proteja `public_html` com senha pelo painel da Hostinger ou implemente autenticação antes da publicação.
