// src/routes/index.js
// Rotas principais de navegação (páginas públicas). A partir da Etapa 5,
// catálogo/produto/admin consultam o banco de dados real via produtoModel
// e categoriaModel — os dados de exemplo (produtosMock.js) não são mais usados.

const express = require('express');
const router = express.Router();
const produtoModel = require('../models/produtoModel');
const { autenticarPagina } = require('../middlewares/auth');
const usuarioController = require('../controllers/usuarioController');
const produtoController = require('../controllers/produtoController');
const seoController = require('../controllers/seoController');

router.get('/sitemap.xml', seoController.sitemap);
router.get('/robots.txt', seoController.robots);

router.get('/', async (req, res) => {
  const destaques = await produtoModel.listarDestaques();
  res.render('home', {
    titulo: 'Início',
    descricao: 'Descartáveis para o seu negócio ou sua casa: embalagens, itens de festa, higiene e uso único, com entrega rápida.',
    destaques,
  });
});

router.get('/sobre', (req, res) => {
  res.render('sobre', {
    titulo: 'Sobre nós',
  });
});

router.get('/contato', (req, res) => {
  res.render('contato', {
    titulo: 'Contato',
  });
});

// --- Catálogo e produto (lógica completa no produtoController) ---
router.get('/catalogo', produtoController.paginaCatalogo);
router.get('/produto/:id/:slug?', produtoController.paginaProduto);

// --- Autenticação ---
router.get('/login', (req, res) => {
  res.render('login', { titulo: 'Entrar' });
});

router.get('/cadastro', (req, res) => {
  res.render('cadastro', { titulo: 'Criar conta' });
});

router.get('/recuperar-senha', (req, res) => {
  res.render('recuperar-senha', { titulo: 'Recuperar senha' });
});

router.get('/redefinir-senha', (req, res) => {
  res.render('redefinir-senha', { titulo: 'Redefinir senha', token: req.query.token || '' });
});

// --- Perfil (protegido: exige login) ---
router.get('/perfil', autenticarPagina, usuarioController.verPerfil);

// --- Páginas institucionais ---
router.get('/politica-de-privacidade', (req, res) => {
  res.render('politica-privacidade', { titulo: 'Política de Privacidade' });
});

router.get('/termos-de-uso', (req, res) => {
  res.render('termos-uso', { titulo: 'Termos de Uso' });
});

module.exports = router;
