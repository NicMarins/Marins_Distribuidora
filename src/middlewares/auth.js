// src/middlewares/auth.js
// Middlewares de autenticação (via JWT em cookie httpOnly) e de controle
// de acesso por nível de permissão (administrador / funcionario / cliente).
//
// Existem duas variantes de autenticação porque as rotas de PÁGINA (que
// renderizam HTML) e as rotas de API (que respondem JSON) precisam reagir
// de formas diferentes à ausência/expiração do token.

const { verificarToken } = require('../utils/jwt');

/**
 * Para rotas que renderizam páginas (ex: /perfil, /admin).
 * Sem sessão válida, redireciona para o login.
 */
function autenticarPagina(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    req.usuario = verificarToken(token);
    next();
  } catch (erro) {
    res.clearCookie('token');
    return res.redirect('/login');
  }
}

/**
 * Para rotas de API (ex: /api/usuarios/perfil).
 * Sem sessão válida, responde 401 em JSON.
 */
function autenticarApi(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ erro: 'Não autenticado.' });
  }

  try {
    req.usuario = verificarToken(token);
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

/**
 * Restringe o acesso por papel. Deve ser usado sempre depois de um dos
 * middlewares de autenticação acima, pois depende de req.usuario.
 * Exemplo: router.get('/admin', autenticarPagina, autorizar('administrador', 'funcionario'), ...)
 */
function autorizar(...papeisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !papeisPermitidos.includes(req.usuario.papel)) {
      return res.status(403).render('erro', {
        titulo: 'Acesso negado',
        mensagem: 'Você não tem permissão para acessar esta página.',
      });
    }
    next();
  };
}

/**
 * Não bloqueia a rota — apenas verifica se existe uma sessão válida e
 * disponibiliza os dados do usuário em res.locals.usuarioAtual, para que
 * qualquer view (ex: o cabeçalho) possa exibir "Meu perfil" / "Sair" em
 * vez de "Entrar" / "Criar conta" quando aplicável.
 */
function verificarSessaoOpcional(req, res, next) {
  const token = req.cookies?.token;

  if (token) {
    try {
      res.locals.usuarioAtual = verificarToken(token);
    } catch (erro) {
      res.locals.usuarioAtual = null;
    }
  } else {
    res.locals.usuarioAtual = null;
  }

  next();
}

module.exports = { autenticarPagina, autenticarApi, autorizar, verificarSessaoOpcional };
