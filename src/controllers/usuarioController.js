// src/controllers/usuarioController.js

const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const usuarioModel = require('../models/usuarioModel');
const { salvarImagemProcessada } = require('../middlewares/upload');

const SALT_ROUNDS = 12;

/** Usado pela rota de página GET /perfil (renderiza HTML). */
async function verPerfil(req, res) {
  const usuario = await usuarioModel.buscarPorId(req.usuario.id);
  res.render('perfil', { titulo: 'Meu perfil', usuario });
}

/** Usado pela API POST /api/usuarios/perfil (chamada pelo formulário). */
async function atualizarPerfil(req, res) {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    const usuarioSeguro = await usuarioModel.buscarPorId(req.usuario.id);
    return res.status(400).render('perfil', {
      titulo: 'Meu perfil',
      usuario: usuarioSeguro,
      erroPerfil: erros.array()[0].msg,
    });
  }

  const { nome, email, telefone } = req.body;
  await usuarioModel.atualizarPerfil(req.usuario.id, { nome, email, telefone });
  res.redirect('/perfil');
}

async function alterarSenha(req, res) {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    const usuarioSeguro = await usuarioModel.buscarPorId(req.usuario.id);
    return res.status(400).render('perfil', {
      titulo: 'Meu perfil',
      usuario: usuarioSeguro,
      erroSenha: erros.array()[0].msg,
    });
  }

  const { senhaAtual, novaSenha } = req.body;

  const usuario = await usuarioModel.buscarComSenhaPorId(req.usuario.id);
  const senhaValida = await bcrypt.compare(senhaAtual, usuario.password_hash);

  if (!senhaValida) {
    const usuarioSeguro = await usuarioModel.buscarPorId(req.usuario.id);
    return res.status(400).render('perfil', {
      titulo: 'Meu perfil',
      usuario: usuarioSeguro,
      erroSenha: 'Senha atual incorreta.',
    });
  }

  const novoHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
  await usuarioModel.atualizarSenha(req.usuario.id, novoHash);

  res.redirect('/perfil');
}

async function atualizarAvatar(req, res) {
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
  }

  try {
    const caminho = await salvarImagemProcessada(req.file.buffer, 'avatars', {
      largura: 300,
      qualidade: 75,
    });
    const resultado = await usuarioModel.atualizarAvatar(req.usuario.id, caminho);
    res.json({ sucesso: true, avatarUrl: resultado.avatar_url });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
}

// --- Administração (painel admin) ---

const PAPEIS_VALIDOS = ['administrador', 'funcionario', 'cliente'];

async function atualizarPapelAdmin(req, res) {
  const { papel } = req.body;
  const { id } = req.params;

  if (!PAPEIS_VALIDOS.includes(papel)) {
    return res.status(400).json({ erro: 'Papel inválido.' });
  }

  if (Number(id) === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode alterar seu próprio nível de acesso.' });
  }

  const usuario = await usuarioModel.atualizarPapel(id, papel);
  if (!usuario) {
    return res.status(404).json({ erro: 'Usuário não encontrado.' });
  }

  res.json(usuario);
}

async function excluirAdmin(req, res) {
  const { id } = req.params;

  if (Number(id) === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode excluir a própria conta por aqui.' });
  }

  await usuarioModel.excluir(id);
  res.status(204).send();
}

module.exports = {
  verPerfil,
  atualizarPerfil,
  alterarSenha,
  atualizarAvatar,
  atualizarPapelAdmin,
  excluirAdmin,
};
