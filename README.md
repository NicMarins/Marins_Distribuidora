# DescarteCerto — Loja de Produtos Descartáveis

Teste de deploy que meu amigo nicolas pediu para fazer no readme, isso sera apagado depois

Plataforma web para venda de produtos descartáveis (embalagens, festas,
higiene e uso único).

> **Status:** Etapa 2 concluída (Estrutura Inicial). Documentação completa
> de instalação, deploy e uso será finalizada na Etapa 10.

## Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+), templates EJS
- **Backend:** Node.js + Express
- **Banco de dados:** PostgreSQL
- **Autenticação:** JWT + bcrypt
- **Upload de imagens:** Multer + Sharp

## Como rodar (desenvolvimento)

```bash
npm install
cp .env.example .env
# edite o .env com suas credenciais de banco de dados
psql $DATABASE_URL -f src/database/schema.sql
psql $DATABASE_URL -f src/database/seed.sql   # opcional: popula com produtos de exemplo
npm run dev
```

Após subir o servidor, crie um usuário administrador promovendo manualmente
um cadastro feito por `/cadastro`:
```sql
UPDATE users SET role = 'administrador' WHERE email = 'seu@email.com';
```

O servidor sobe em `http://localhost:3000`.

## Estrutura de pastas

```
/src
  /config        Conexão com banco de dados e variáveis de ambiente
  /routes        Rotas Express, organizadas por módulo
  /controllers   Lógica de cada rota (adicionado a partir da Etapa 4)
  /models        Consultas/schemas do banco de dados
  /middlewares   Autenticação, validação, upload, rate limit
  /public        Arquivos estáticos (CSS, JS do cliente, imagens)
  /views         Templates EJS (páginas e partials reutilizáveis)
  /uploads       Imagens enviadas pelos usuários (não versionado)
/tests           Testes automatizados (Etapa 9)
server.js        Ponto de entrada da aplicação
```

## Dependências e por que cada uma foi usada

| Pacote | Finalidade |
|---|---|
| express | Framework web / roteamento |
| express-async-errors | Garante que erros dentro de controllers `async` cheguem ao handler de erros (Express 4 não faz isso nativamente) |
| ejs | Templates server-side para SEO nas páginas de catálogo/produto |
| pg | Driver PostgreSQL |
| bcrypt | Hash seguro de senhas |
| jsonwebtoken | Autenticação via JWT |
| cookie-parser | Leitura de cookies (sessão) |
| express-validator | Validação de formulários no backend |
| multer | Upload de arquivos (imagens de produto) |
| sharp | Compressão/otimização de imagens |
| helmet | Cabeçalhos HTTP de segurança |
| express-rate-limit | Proteção contra abuso/força bruta |
| compression | Compressão gzip das respostas |
| morgan | Logs de requisições HTTP |
| terser | Minificação de JavaScript (`npm run build`) |
| clean-css | Minificação de CSS (`npm run build`) |
| jest | Framework de testes (`npm test`) |
| supertest | Testes de integração de rotas HTTP sem precisar subir um servidor real |

## Segurança implementada (Etapa 7)

| Medida | Onde |
|---|---|
| Hash de senhas (bcrypt, 12 rounds) | `usuarioController`, `authController` |
| Proteção contra SQL Injection | Todas as queries usam parâmetros (`$1, $2...`) — nunca concatenação de string |
| Proteção contra XSS | EJS escapa por padrão (`<%= %>`); CSP restritivo via helmet; JS do cliente escapa antes de usar `innerHTML` |
| Proteção contra CSRF | Token via cookie + campo oculto/header (`src/middlewares/csrf.js`) |
| Rate limiting | Geral (300 req/15min) + login/cadastro (20/15min) + contato (10/15min) |
| Validação de formulários | `express-validator` em todas as rotas de escrita |
| Sessões seguras | JWT em cookie `httpOnly`, `sameSite: lax`, `secure` em produção |
| Upload seguro de imagens | Multer valida tipo/tamanho; Sharp reprocessa e gera nome de arquivo aleatório |
| Controle de acesso | Middlewares `autenticarPagina`/`autenticarApi` + `autorizar(...papéis)` |
| Logs de erros | `src/utils/logger.js` — grava em `logs/error.log` (nunca loga senhas/dados sensíveis) |

**Importante para produção:** defina `NODE_ENV=production` no seu serviço de
hospedagem — isso ativa cookies `secure` (exigem HTTPS) e oculta detalhes
técnicos de erro do usuário final. `trust proxy` já está configurado para
funcionar corretamente atrás do proxy do Render/Railway.

## Performance e SEO (Etapa 8)

| Medida | Como |
|---|---|
| Lazy loading de imagens | `loading="lazy"` em todas as imagens de produto |
| Compressão de imagens | Sharp reprocessa todo upload para WebP (Etapa 4/5) |
| Compressão de resposta | `compression` (gzip) em todas as respostas HTTP |
| Cache de arquivos estáticos | `Cache-Control: max-age=30d` + cache-busting automático via `asset()` |
| Minificação de CSS/JS | `npm run build` gera versões `.min` em `src/public/dist/` |
| Cache de views | EJS compilado em memória quando `NODE_ENV=production` |
| Cache de API | Categorias (mudam raramente) com `Cache-Control: max-age=300` |
| Meta tags dinâmicas | Título/descrição por página, Open Graph, Twitter Card |
| Schema.org | `Store` (site) e `Product` (página de produto — preço, estoque, SKU) |
| URLs amigáveis | `/produto/:id/:slug-do-nome` (com canonical apontando sempre para essa versão) |
| Sitemap dinâmico | `/sitemap.xml` — sempre reflete produtos/categorias atuais do banco |
| Robots.txt | `/robots.txt` — bloqueia `/admin`, `/api`, páginas de autenticação |
| Acessibilidade | `aria-label` em botões só-ícone, HTML semântico, navegação por teclado, contraste do design system |

**Antes de colocar em produção, rode:**
```bash
npm run build
```
Isso gera as versões minificadas de CSS/JS em `src/public/dist/`. Se o seu
provedor de hospedagem (Render/Railway) permitir configurar um "Build
Command", use `npm install && npm run build` para que isso aconteça
automaticamente a cada deploy.

## Testes (Etapa 9)

```bash
# 1. Crie um banco Postgres DESCARTÁVEL só para testes (nunca produção —
#    o schema inteiro é apagado e recriado a cada execução).
# 2. Configure TEST_DATABASE_URL no seu .env
# 3. Rode:
npm test
```

O que é coberto:

| Tipo | Arquivo | O que testa |
|---|---|---|
| Unitário | `tests/unit/slug.test.js` | Geração de slugs (acentos, espaços, símbolos) |
| Unitário | `tests/unit/csrf.test.js` | Lógica do middleware CSRF, com req/res simulados |
| Integração | `tests/integration/paginas-publicas.test.js` | Home, catálogo (filtro/busca), produto, 404, sitemap, robots.txt, controle de acesso |
| Integração | `tests/integration/auth.test.js` | Cadastro, login, logout, validação server-side, controle de acesso por papel |
| Integração | `tests/integration/seguranca.test.js` | Cabeçalhos do helmet, CSRF real (bloqueio e sucesso), rate limiting, upload sem autenticação |
| Integração | `tests/integration/admin-produtos.test.js` | CRUD completo de produtos, papéis (admin vs funcionário), validação de preço/código duplicado |

Os testes de integração usam `supertest` contra o app Express real (sem
precisar subir um servidor na porta), com `tests/globalSetup.js` recriando
o schema e populando com `seed.sql` antes da suíte rodar.

## Progresso das etapas

- [x] Etapa 1 — Planejamento
- [x] Etapa 2 — Estrutura Inicial
- [x] Etapa 3 — Interface (Frontend)
- [x] Etapa 4 — Backend
- [x] Etapa 5 — Catálogo de Produtos
- [x] Etapa 6 — Painel Administrativo
- [x] Etapa 7 — Segurança
- [x] Etapa 8 — Performance
- [x] Etapa 9 — Testes
- [ ] Etapa 10 — Documentação final
