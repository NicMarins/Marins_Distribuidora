// src/routes/categorias.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { autenticarApi, autorizar } = require('../middlewares/auth');
const categoriaController = require('../controllers/categoriaController');

router.get('/', categoriaController.listar);

router.post(
  '/',
  autenticarApi,
  autorizar('administrador', 'funcionario'),
  [body('nome').trim().notEmpty().withMessage('Informe o nome da categoria.')],
  categoriaController.criar
);

router.delete('/:id', autenticarApi, autorizar('administrador'), categoriaController.excluir);

module.exports = router;
