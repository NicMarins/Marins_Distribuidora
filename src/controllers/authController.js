// src/controllers/authController.js

const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const usuarioModel = require('../models/usuarioModel');
const tokenModel = require('../models/tokenRecuperacaoModel');
const { gerarToken } = require('../utils/jwt');

const SALT_ROUNDS = 12;

function definirCookieSessao(res, token) {
  res.cookie('token', token, {
    httpOnly: true, // inacessível via JavaScript no navegador (mitiga XSS roubando o token)
    secure: process.env.NODE_ENV === 'production', // exige HTTPS em produção
    sameSite: 'lax', // mitiga CSRF em navegação cross-site
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
  });
}

async function cadastrar(req, res) {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).render('cadastro', { titulo: 'Criar conta', erros: erros.array() });
  }

  const { nome, email, senha, confirmarSenha, telefone } = req.body;

  if (senha !== confirmarSenha) {
    return res.status(400).render('cadastro', {
      titulo: 'Criar conta',
      erros: [{ msg: 'As senhas não coincidem.' }],
    });
  }

  const existente = await usuarioModel.buscarComSenhaPorEmail(email);
  if (existente) {
    return res.status(409).render('cadastro', {
      titulo: 'Criar conta',
      erros: [{ msg: 'Este e-mail já está cadastrado.' }],
    });
  }

  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
  const usuario = await usuarioModel.criar({ nome, email, senhaHash, telefone });

  const token = gerarToken({ id: usuario.id, papel: usuario.role, nome: usuario.name });
  definirCookieSessao(res, token);

  res.redirect('/perfil');
}

async function login(req, res) {
  const { email, senha } = req.body;

  const usuario = await usuarioModel.buscarComSenhaPorEmail(email);
  const senhaValida = usuario ? await bcrypt.compare(senha, usuario.password_hash) : false;

  // Mensagem genérica de propósito: não revela se o erro foi no e-mail
  // ou na senha, dificultando a enumeração de contas cadastradas.
  if (!usuario || !senhaValida) {
    return res.status(401).render('login', {
      titulo: 'Entrar',
      erros: [{ msg: 'E-mail ou senha inválidos.' }],
    });
  }

  const token = gerarToken({ id: usuario.id, papel: usuario.role, nome: usuario.name });
  definirCookieSessao(res, token);

  const destino = usuario.role === 'administrador' || usuario.role === 'funcionario' ? '/admin' : '/perfil';
  res.redirect(destino);
}

function logout(req, res) {
  res.clearCookie('token');
  res.redirect('/');
}

async function solicitarRecuperacao(req, res) {
  const { email } = req.body;
  const usuario = await usuarioModel.buscarComSenhaPorEmail(email);

  // Sempre respondemos com a mesma mensagem de sucesso, exista ou não o
  // e-mail — evita que alguém use este formulário para descobrir quais
  // e-mails estão cadastrados no sistema.
  if (usuario) {
    const token = await tokenModel.criarToken(usuario.id);
    // TODO (produção): integrar um serviço de envio de e-mail (ex: nodemailer
    // + SendGrid/Amazon SES) para enviar este link automaticamente. Por ora,
    // ele é apenas registrado no log do servidor para viabilizar testes.
    console.log(`[recuperação de senha] link para ${email}: /redefinir-senha?token=${token}`);
  }

  res.render('recuperar-senha', {
    titulo: 'Recuperar senha',
    mensagemSucesso: 'Se este e-mail estiver cadastrado, você receberá um link de redefinição em instantes.',
  });
}

async function redefinirSenha(req, res) {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).render('redefinir-senha', {
      titulo: 'Redefinir senha',
      token: req.body.token,
      erros: erros.array(),
    });
  }

  const { token, senha, confirmarSenha } = req.body;

  if (senha !== confirmarSenha) {
    return res.status(400).render('redefinir-senha', {
      titulo: 'Redefinir senha',
      token,
      erros: [{ msg: 'As senhas não coincidem.' }],
    });
  }

  const registro = await tokenModel.validarToken(token);
  if (!registro) {
    return res.status(400).render('redefinir-senha', {
      titulo: 'Redefinir senha',
      token,
      erros: [{ msg: 'Link inválido ou expirado. Solicite uma nova redefinição.' }],
    });
  }

  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
  await usuarioModel.atualizarSenha(registro.user_id, senhaHash);
  await tokenModel.marcarComoUsado(registro.id);

  res.render('login', {
    titulo: 'Entrar',
    mensagemSucesso: 'Senha redefinida com sucesso. Faça login com sua nova senha.',
  });
}

module.exports = { cadastrar, login, logout, solicitarRecuperacao, redefinirSenha };
