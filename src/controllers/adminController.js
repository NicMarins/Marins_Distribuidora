// src/controllers/adminController.js
// Controla a renderização das páginas do painel administrativo. As ações
// de escrita (criar/editar/excluir) são feitas via fetch no navegador,
// chamando as rotas de API já existentes (produtos, categorias, usuarios,
// contato) — este controller cuida apenas do HTML inicial de cada tela.

const produtoModel = require('../models/produtoModel');
const categoriaModel = require('../models/categoriaModel');
const usuarioModel = require('../models/usuarioModel');
const contatoModel = require('../models/contatoModel');
const configuracaoModel = require('../models/configuracaoModel');
const produtoImagemModel = require('../models/produtoImagemModel');

async function paginaDashboard(req, res) {
  const [{ produtos }, totalProdutos, estoqueBaixo, categorias, contatos] = await Promise.all([
    produtoModel.listar({ pagina: 1, porPagina: 6, ordenar: 'recentes' }),
    produtoModel.contarTodos(),
    produtoModel.contarEstoqueBaixo(),
    categoriaModel.listarTodas(),
    contatoModel.listarTodos(),
  ]);

  res.render('admin/dashboard', {
    titulo: 'Painel Administrativo',
    produtos,
    totalProdutos,
    estoqueBaixo,
    totalCategorias: categorias.length,
    contatosNaoLidos: contatos.filter((c) => !c.read).length,
  });
}

// --- Produtos ---

async function paginaProdutos(req, res) {
  const { categoria, busca, pagina, estoque } = req.query;
  const [{ produtos, total, paginaAtual, totalPaginas }, categorias] = await Promise.all([
    produtoModel.listar({
      categoria,
      busca,
      pagina,
      ordenar: 'recentes',
      porPagina: 10,
      estoqueBaixo: estoque === 'baixo',
    }),
    categoriaModel.listarTodas(),
  ]);

  res.render('admin/produtos-lista', {
    titulo: 'Gerenciar Produtos',
    produtos,
    categorias,
    total,
    paginaAtual,
    totalPaginas,
    filtroAtual: { categoria: categoria || '', busca: busca || '' },
  });
}

async function paginaNovoProduto(req, res) {
  const categorias = await categoriaModel.listarTodas();
  res.render('admin/produto-form', {
    titulo: 'Novo Produto',
    modo: 'criar',
    produto: null,
    imagens: [],
    categorias,
  });
}

async function paginaEditarProduto(req, res, next) {
  const produto = await produtoModel.buscarPorId(req.params.id);
  if (!produto) return next();

  const [imagens, categorias] = await Promise.all([
    produtoImagemModel.listarPorProduto(produto.id),
    categoriaModel.listarTodas(),
  ]);

  res.render('admin/produto-form', {
    titulo: `Editar — ${produto.nome}`,
    modo: 'editar',
    produto,
    imagens,
    categorias,
  });
}

// --- Categorias ---

async function paginaCategorias(req, res) {
  const categorias = await categoriaModel.listarTodas();
  res.render('admin/categorias', { titulo: 'Gerenciar Categorias', categorias });
}

// --- Usuários ---

async function paginaUsuarios(req, res) {
  const usuarios = await usuarioModel.listarTodos();
  res.render('admin/usuarios', { titulo: 'Gerenciar Usuários', usuarios });
}

// --- Contatos ---

async function paginaContatos(req, res) {
  const contatos = await contatoModel.listarTodos();
  res.render('admin/contatos', { titulo: 'Mensagens de Contato', contatos });
}

// --- Configurações do site ---

async function paginaConfiguracoes(req, res) {
  const configuracoes = await configuracaoModel.obterTodas();
  res.render('admin/configuracoes', { titulo: 'Configurações do Site', configuracoes, salvo: false });
}

async function salvarConfiguracoes(req, res) {
  const { site_nome, site_whatsapp, site_email, site_instagram, site_facebook } = req.body;

  await configuracaoModel.definirVarias({
    site_nome,
    site_whatsapp,
    site_email,
    site_instagram,
    site_facebook,
  });

  const configuracoes = await configuracaoModel.obterTodas();
  res.render('admin/configuracoes', { titulo: 'Configurações do Site', configuracoes, salvo: true });
}

module.exports = {
  paginaDashboard,
  paginaProdutos,
  paginaNovoProduto,
  paginaEditarProduto,
  paginaCategorias,
  paginaUsuarios,
  paginaContatos,
  paginaConfiguracoes,
  salvarConfiguracoes,
};
