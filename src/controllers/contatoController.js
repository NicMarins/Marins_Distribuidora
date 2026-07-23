// src/controllers/contatoController.js

const { validationResult } = require('express-validator');
const contatoModel = require('../models/contatoModel');

async function enviar(req, res) {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).render('contato', { titulo: 'Contato', erros: erros.array() });
  }

  const { nome, email, telefone, mensagem } = req.body;
  await contatoModel.criar({ nome, email, telefone, mensagem });

  res.render('contato', {
    titulo: 'Contato',
    mensagemSucesso: 'Mensagem enviada! Nossa equipe responderá em breve.',
  });
}

/** Usado pelo painel administrativo. */
async function listar(req, res) {
  const contatos = await contatoModel.listarTodos();
  res.json(contatos);
}

async function marcarLido(req, res) {
  await contatoModel.marcarComoLido(req.params.id);
  res.status(204).send();
}

module.exports = { enviar, listar, marcarLido };
