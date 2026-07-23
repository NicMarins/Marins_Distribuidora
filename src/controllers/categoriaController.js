// src/controllers/categoriaController.js

const { validationResult } = require('express-validator');
const categoriaModel = require('../models/categoriaModel');

async function listar(req, res) {
  const categorias = await categoriaModel.listarTodas();
  // Categorias mudam raramente — um cache curto no navegador/CDN evita
  // bater no banco a cada carregamento do catálogo sem arriscar servir
  // dados desatualizados por muito tempo.
  res.set('Cache-Control', 'public, max-age=300');
  res.json(categorias);
}

async function criar(req, res) {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ erros: erros.array() });
  }

  const categoria = await categoriaModel.criar(req.body.nome);
  res.status(201).json(categoria);
}

async function excluir(req, res) {
  await categoriaModel.excluir(req.params.id);
  res.status(204).send();
}

module.exports = { listar, criar, excluir };
