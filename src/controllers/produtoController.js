// src/controllers/produtoController.js

const { validationResult } = require('express-validator');
const produtoModel = require('../models/produtoModel');
const produtoImagemModel = require('../models/produtoImagemModel');
const categoriaModel = require('../models/categoriaModel');
const { salvarImagemProcessada } = require('../middlewares/upload');

const MAX_IMAGENS_POR_PRODUTO = 6;

// --- Páginas públicas ---

async function paginaCatalogo(req, res) {
  const { categoria, busca, ordenar, pagina } = req.query;

  const [{ produtos, total, paginaAtual, totalPaginas }, categorias] = await Promise.all([
    produtoModel.listar({ categoria, busca, ordenar, pagina }),
    categoriaModel.listarTodas(),
  ]);

  const descricaoCategoria = categorias.find((c) => c.slug === categoria)?.name;

  res.render('catalogo', {
    titulo: descricaoCategoria ? `Catálogo — ${descricaoCategoria}` : 'Catálogo',
    descricao: descricaoCategoria
      ? `Confira nossos produtos descartáveis de ${descricaoCategoria.toLowerCase()}: preços, estoque e entrega rápida.`
      : 'Catálogo completo de produtos descartáveis: copos, embalagens, limpeza e higiene, com busca e filtros por categoria.',
    produtos,
    categorias,
    total,
    paginaAtual,
    totalPaginas,
    filtroAtual: { categoria: categoria || '', busca: busca || '', ordenar: ordenar || '' },
  });
}

async function paginaProduto(req, res, next) {
  const produto = await produtoModel.buscarPorId(req.params.id);

  if (!produto) {
    return next();
  }

  const relacionados = await produtoModel.listarRelacionados(produto);
  const imagemPrincipal = produto.imagens[0];
  const ogImagem = imagemPrincipal?.startsWith('http')
  ? imagemPrincipal
  : imagemPrincipal
    ? `${req.protocol}://${req.get('host')}${imagemPrincipal}`
    : undefined;

  const dadosEstruturados = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: produto.nome,
    description: produto.descricao || produto.nome,
    sku: produto.codigo,
    ...(produto.marca ? { brand: { '@type': 'Brand', name: produto.marca } } : {}),
    image: produto.imagens,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: produto.preco.toFixed(2),
      availability: produto.estoque > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${req.protocol}://${req.get('host')}/produto/${produto.id}/${produto.slug}`,
    },
  };
  // Escapa "<" para que um nome/descrição contendo "</script>" não consiga
  // fechar a tag <script> prematuramente e injetar HTML na página.
  const jsonLdProduto = JSON.stringify(dadosEstruturados).replace(/</g, '\\u003c');

  res.render('produto', {
    titulo: produto.nome,
    descricao: (produto.descricao || `${produto.nome} — ${produto.marca || ''}`).slice(0, 155),
    ogTipo: 'product',
    ogImagem,
    jsonLdProduto,
    // Sobrescreve o urlAtual global: tanto /produto/:id quanto
    // /produto/:id/:slug renderizam esta mesma página, então a URL
    // canônica precisa ser sempre a versão com slug — caso contrário,
    // buscadores podem indexar as duas como conteúdo duplicado.
    urlAtual: `${req.protocol}://${req.get('host')}/produto/${produto.id}/${produto.slug}`,
    produto,
    relacionados,
  });
}

// --- API JSON (usada pela busca instantânea do catálogo) ---

async function listarJson(req, res) {
  const { categoria, busca, ordenar, pagina } = req.query;
  const resultado = await produtoModel.listar({ categoria, busca, ordenar, pagina });
  res.json(resultado);
}

// --- CRUD administrativo (protegido por autenticarApi + autorizar) ---

async function criar(req, res) {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ erros: erros.array() });
  }

  const { codigo, nome, descricao, marca, preco, estoque, categoriaId, destaque } = req.body;

  if (await produtoModel.existeCodigo(codigo)) {
    return res.status(409).json({ erro: 'Já existe um produto com este código.' });
  }

  const produto = await produtoModel.criar({
    codigo,
    nome,
    descricao,
    marca,
    preco,
    estoque,
    categoriaId,
    destaque: destaque === 'true' || destaque === true,
  });

  res.status(201).json(produto);
}

async function atualizar(req, res) {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ erros: erros.array() });
  }

  const { id } = req.params;
  const { codigo, nome, descricao, marca, preco, estoque, categoriaId, destaque } = req.body;

  if (codigo && (await produtoModel.existeCodigo(codigo, id))) {
    return res.status(409).json({ erro: 'Já existe outro produto com este código.' });
  }

  const produto = await produtoModel.atualizar(id, {
    codigo,
    nome,
    descricao,
    marca,
    preco,
    estoque,
    categoriaId,
    destaque: destaque === undefined ? undefined : destaque === 'true' || destaque === true,
  });

  if (!produto) {
    return res.status(404).json({ erro: 'Produto não encontrado.' });
  }

  res.json(produto);
}

async function excluir(req, res) {
  await produtoModel.excluir(req.params.id);
  res.status(204).send();
}

async function uploadImagens(req, res) {
  const { id } = req.params;
  const arquivos = req.files || [];

  if (arquivos.length === 0) {
    return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
  }

  const jaExistentes = await produtoImagemModel.contarPorProduto(id);
  if (jaExistentes + arquivos.length > MAX_IMAGENS_POR_PRODUTO) {
    return res.status(400).json({
      erro: `Limite de ${MAX_IMAGENS_POR_PRODUTO} imagens por produto excedido.`,
    });
  }

  try {
    const imagensSalvas = [];
    for (let i = 0; i < arquivos.length; i += 1) {
      const url = await salvarImagemProcessada(arquivos[i].buffer, 'produtos', {
        largura: 1000,
        qualidade: 82,
      });
      const registro = await produtoImagemModel.adicionar(id, url, jaExistentes + i);
      imagensSalvas.push(registro);
    }
    res.status(201).json(imagensSalvas);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
}

async function excluirImagem(req, res) {
  const { id, imagemId } = req.params;
  await produtoImagemModel.excluir(imagemId, id);
  res.status(204).send();
}

module.exports = {
  paginaCatalogo,
  paginaProduto,
  listarJson,
  criar,
  atualizar,
  excluir,
  uploadImagens,
  excluirImagem,
};
