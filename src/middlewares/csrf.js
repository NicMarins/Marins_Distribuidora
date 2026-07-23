// src/middlewares/csrf.js
// Proteção contra CSRF usando o padrão "double-submit cookie": um token
// aleatório é gravado em um cookie legível por JavaScript (não httpOnly) e
// precisa ser reenviado pelo cliente — em um campo oculto do formulário ou
// no header X-CSRF-Token das chamadas fetch. Um invasor que force o
// navegador da vítima a disparar uma requisição (CSRF clássico) não
// consegue ler o cookie de outro domínio, então não tem como descobrir o
// valor a reenviar, mesmo que a requisição saia com os cookies de sessão
// da vítima automaticamente.
//
// Não usamos a biblioteca `csurf` porque ela está descontinuada; esta
// implementação é simples o bastante para não precisar de uma dependência
// extra.

const crypto = require('crypto');

const NOME_COOKIE = 'csrfToken';
const METODOS_SEGUROS = ['GET', 'HEAD', 'OPTIONS'];

/** Garante que todo visitante tenha um token CSRF, e disponibiliza em res.locals para as views. */
function gerarTokenCsrf(req, res, next) {
  let token = req.cookies?.[NOME_COOKIE];

  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(NOME_COOKIE, token, {
      httpOnly: false, // precisa ser legível pelo JavaScript do cliente para ir no header das chamadas fetch
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 1 dia
    });
  }

  res.locals.csrfToken = token;
  next();
}

/** Valida o token em toda requisição que muda estado (POST/PUT/PATCH/DELETE). */
function verificarCsrf(req, res, next) {
  if (METODOS_SEGUROS.includes(req.method)) {
    return next();
  }

  const tokenCookie = req.cookies?.[NOME_COOKIE];
  const tokenEnviado = req.body?._csrf || req.get('X-CSRF-Token');

  const tokenValido =
    !!tokenCookie &&
    !!tokenEnviado &&
    tokenCookie.length === tokenEnviado.length &&
    crypto.timingSafeEqual(Buffer.from(tokenCookie), Buffer.from(tokenEnviado));

  if (!tokenValido) {
    const prefereJson = req.accepts(['html', 'json']) === 'json';

    if (prefereJson) {
      return res.status(403).json({
        erro: 'Falha na validação de segurança (CSRF). Recarregue a página e tente novamente.',
      });
    }

    return res.status(403).render('erro', {
      titulo: 'Erro de segurança',
      mensagem: 'Não foi possível validar sua sessão. Recarregue a página e tente novamente.',
    });
  }

  next();
}

module.exports = { gerarTokenCsrf, verificarCsrf };
