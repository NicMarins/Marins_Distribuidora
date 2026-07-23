// src/routes/admin.js
// Todas as rotas aqui exigem login + papel de administrador ou funcionário
// (o router.use abaixo aplica isso a tudo que vem depois, sem precisar
// repetir os middlewares em cada rota individual).

const express = require('express');
const router = express.Router();
const { autenticarPagina, autorizar } = require('../middlewares/auth');
const adminController = require('../controllers/adminController');

router.use(autenticarPagina, autorizar('administrador', 'funcionario'));

router.get('/', adminController.paginaDashboard);

router.get('/produtos', adminController.paginaProdutos);
router.get('/produtos/novo', adminController.paginaNovoProduto);
router.get('/produtos/:id/editar', adminController.paginaEditarProduto);

router.get('/categorias', adminController.paginaCategorias);

router.get('/usuarios', adminController.paginaUsuarios);

router.get('/contatos', adminController.paginaContatos);

router.get('/configuracoes', adminController.paginaConfiguracoes);
router.post('/configuracoes', adminController.salvarConfiguracoes);

module.exports = router;
