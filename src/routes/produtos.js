// src/routes/produtos.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { autenticarApi, autorizar } = require('../middlewares/auth');
const { upload, manipularErroUpload } = require('../middlewares/upload');
const produtoController = require('../controllers/produtoController');

const validarProduto = [
  body('codigo').trim().notEmpty().withMessage('Informe o código do produto.'),
  body('nome').trim().notEmpty().withMessage('Informe o nome do produto.'),
  body('preco').isFloat({ min: 0 }).withMessage('Informe um preço válido.'),
  body('estoque').optional().isInt({ min: 0 }).withMessage('O estoque deve ser um número inteiro não negativo.'),
  body('categoriaId').optional({ nullable: true }).isInt().withMessage('Categoria inválida.'),
];

const validarAtualizacaoProduto = [
  body('codigo').optional().trim().notEmpty().withMessage('O código não pode ficar em branco.'),
  body('nome').optional().trim().notEmpty().withMessage('O nome não pode ficar em branco.'),
  body('preco').optional().isFloat({ min: 0 }).withMessage('Informe um preço válido.'),
  body('estoque').optional().isInt({ min: 0 }).withMessage('O estoque deve ser um número inteiro não negativo.'),
  body('categoriaId').optional({ nullable: true }).isInt().withMessage('Categoria inválida.'),
];

// --- Pública: usada pela busca instantânea do catálogo ---
router.get('/', produtoController.listarJson);

// --- Administração: exige autenticação + papel administrador/funcionário ---
router.post(
  '/',
  autenticarApi,
  autorizar('administrador', 'funcionario'),
  validarProduto,
  produtoController.criar
);

router.put(
  '/:id',
  autenticarApi,
  autorizar('administrador', 'funcionario'),
  validarAtualizacaoProduto,
  produtoController.atualizar
);

router.delete(
  '/:id',
  autenticarApi,
  autorizar('administrador'), // exclusão é restrita apenas a administradores
  produtoController.excluir
);

router.post(
  '/:id/imagens',
  autenticarApi,
  autorizar('administrador', 'funcionario'),
  upload.array('imagens', 6),
  manipularErroUpload,
  produtoController.uploadImagens
);

router.delete(
  '/:id/imagens/:imagemId',
  autenticarApi,
  autorizar('administrador', 'funcionario'),
  produtoController.excluirImagem
);

module.exports = router;
