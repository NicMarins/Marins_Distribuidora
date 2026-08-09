// src/app.js
// Configuração central da aplicação Express: middlewares, view engine,
// arquivos estáticos e registro de rotas. O servidor real (server.js)
// apenas importa este arquivo e sobe o servidor HTTP.

const express = require('express');
// Sem isso, um erro lançado dentro de uma função async de controller (ex:
// uma query ao banco que falha) nunca chegaria ao handler de erros — a
// requisição simplesmente travaria sem resposta. Precisa vir logo após
// importar o express, antes de qualquer rota ser registrada.
require('express-async-errors');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const mainRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const contatoRoutes = require('./routes/contato');
const produtosRoutes = require('./routes/produtos');
const categoriasRoutes = require('./routes/categorias');
const adminRoutes = require('./routes/admin');
const authController = require('./controllers/authController');

const app = express();

// Necessário quando a aplicação roda atrás de um proxy reverso (Render,
// Railway, Heroku, um load balancer, etc.). Sem isso, req.ip sempre
// retornaria o IP do proxy — fazendo o rate limit tratar todos os
// visitantes como se fossem uma única pessoa — e req.protocol nunca
// indicaria "https", quebrando a detecção de cookies seguros.
app.set('trust proxy', 1);

// --- Segurança básica ---
// helmet: define cabeçalhos HTTP seguros por padrão (proteção contra
// clickjacking, sniffing de MIME, algumas classes de XSS, etc.). O CSP é
// configurado explicitamente (em vez de usar os padrões genéricos do
// helmet) para permitir apenas exatamente o que o site usa: fontes do
// Google Fonts, scripts/estilos do próprio domínio e nada de terceiros.
// Nenhuma view usa atributos de evento inline (onclick, onerror etc.) —
// esse padrão foi removido propositalmente (ver public/js/main.js) porque
// scriptSrcAttr: 'none' bloquearia esse tipo de handler.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

// Rate limit geral: evita abuso em toda a aplicação. Rotas sensíveis
// (login, cadastro, recuperação de senha) têm um limite adicional mais
// rígido definido em routes/auth.js. Uma revisão completa de todos os
// limites acontece na Etapa 7 (Segurança).
const limitadorGeral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 requisições por IP nesse intervalo
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limitadorGeral);

// --- Performance ---
app.use(compression()); // Compacta respostas (gzip) para reduzir tamanho de payload

// --- Logs de requisições (útil em desenvolvimento e depuração) ---
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// --- Parsers ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// --- Arquivos estáticos (CSS, JS do cliente, imagens) ---
// maxAge longo é seguro aqui porque o helper `asset()` (definido abaixo)
// adiciona um parâmetro de versão (?v=...) que muda a cada deploy — o
// navegador busca a versão nova assim que o parâmetro muda, então não há
// risco de servir um arquivo desatualizado para quem já visitou o site.
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '30d' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '30d', immutable: true }));

// --- View engine (EJS) ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Em produção, o EJS mantém as views compiladas em memória em vez de ler
// e recompilar o arquivo a cada requisição — reduz latência por página.
// Em desenvolvimento fica desligado para que alterações apareçam na hora.
app.set('view cache', process.env.NODE_ENV === 'production');

// --- Helper de assets (cache-busting + versão minificada em produção) ---
// asset('/css/style.css') retorna, em produção, '/dist/css/style.min.css?v=X'
// quando esse arquivo minificado existir (gerado por `npm run build`), ou
// o caminho original com '?v=X' caso contrário — X muda a cada reinício do
// processo, forçando o navegador a buscar a versão nova após um deploy.
const fs = require('fs');
const VERSAO_ASSETS = process.env.ASSET_VERSION || Date.now().toString(36);
const ASSETS_MINIFICADOS_DISPONIVEIS = new Set();
['css', 'js'].forEach((tipo) => {
  const pastaDist = path.join(__dirname, 'public', 'dist', tipo);
  if (fs.existsSync(pastaDist)) {
    fs.readdirSync(pastaDist).forEach((arquivo) => ASSETS_MINIFICADOS_DISPONIVEIS.add(`${tipo}/${arquivo}`));
  }
});

function asset(caminho) {
  const match = caminho.match(/^\/(css|js)\/(.+)\.(css|js)$/);

  if (process.env.NODE_ENV === 'production' && match) {
    const [, tipo, nome, extensao] = match;
    const nomeMinificado = `${nome}.min.${extensao}`;
    if (ASSETS_MINIFICADOS_DISPONIVEIS.has(`${tipo}/${nomeMinificado}`)) {
      return `/dist/${tipo}/${nomeMinificado}?v=${VERSAO_ASSETS}`;
    }
  }

  return `${caminho}?v=${VERSAO_ASSETS}`;
}

app.use((req, res, next) => {
  res.locals.asset = asset;
  next();
});

// --- Sessão (não bloqueia, apenas expõe req.usuario/res.locals.usuarioAtual) ---
const { verificarSessaoOpcional } = require('./middlewares/auth');
app.use(verificarSessaoOpcional);
app.use((req, res, next) => {
  res.locals.rotaAtual = req.path;
  res.locals.urlAtual = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  next();
});

// --- Proteção CSRF (double-submit cookie) ---
// Aplicada globalmente: gerarTokenCsrf garante que todo visitante tenha um
// token; verificarCsrf bloqueia qualquer POST/PUT/PATCH/DELETE que não
// reenvie esse token (via campo oculto _csrf nos formulários, ou header
// X-CSRF-Token nas chamadas fetch do painel administrativo).
const { gerarTokenCsrf, verificarCsrf } = require('./middlewares/csrf');
app.use(gerarTokenCsrf);
app.use(verificarCsrf);

// --- Configurações do site (nome da loja, WhatsApp, redes sociais) ---
// Disponível em res.locals.config para qualquer view (rodapé, contato).
// configuracaoModel mantém cache em memória, então isso não bate no banco
// a cada requisição.
const configuracaoModel = require('./models/configuracaoModel');
app.use(async (req, res, next) => {
  try {
    res.locals.config = await configuracaoModel.obterTodas();
  } catch (erro) {
    res.locals.config = {};
  }
  next();
});

// --- Rotas ---
app.use('/', mainRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/contato', contatoRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/admin', adminRoutes);
app.get('/logout', authController.logout);

// --- Página 404 (deve vir depois de todas as rotas) ---
app.use((req, res) => {
  res.status(404).render('404', { titulo: 'Página não encontrada' });
});

// --- Tratamento de erros centralizado ---
// Qualquer erro passado via next(err) cai aqui, evitando vazamento de
// stack traces para o usuário final em produção.
const { registrarErro } = require('./utils/logger');
app.use((err, req, res, next) => {
  registrarErro(err, req);
  res.status(err.status || 500).render('erro', {
    titulo: 'Erro interno',
    mensagem: process.env.NODE_ENV === 'production'
      ? 'Ocorreu um erro. Tente novamente mais tarde.'
      : err.message,
  });
});

module.exports = app;
