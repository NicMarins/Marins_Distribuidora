// src/models/produtoModel.js
// Substitui o produtosMock.js usado nas Etapas 3/4. Todas as queries usam
// parâmetros ($1, $2...), o que previne SQL Injection.

const pool = require('../config/db');
const { gerarSlug } = require('../utils/slug');

const SELECT_BASE = `
  SELECT
    p.*,
    c.name AS category_name,
    c.slug AS category_slug,
    COALESCE(
      (SELECT array_agg(pi.url ORDER BY pi.position) FROM product_images pi WHERE pi.product_id = p.id),
      '{}'
    ) AS imagens_urls
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

const COLUNAS_ORDENACAO = {
  'menor-preco': 'p.price ASC',
  'maior-preco': 'p.price DESC',
  nome: 'p.name ASC',
  recentes: 'p.created_at DESC',
};

/** Converte uma linha do banco (snake_case) no formato usado pelas views. */
function mapearProduto(row) {
  return {
    id: row.id,
    codigo: row.code,
    nome: row.name,
    slug: gerarSlug(row.name),
    descricao: row.description,
    marca: row.brand,
    preco: Number(row.price),
    estoque: row.stock,
    destaque: row.featured,
    categoria: row.category_name || 'Sem categoria',
    categoriaSlug: row.category_slug || null,
    categoriaId: row.category_id,
    imagens: row.imagens_urls && row.imagens_urls.length ? row.imagens_urls : ['/images/placeholder-produto.svg'],
    criadoEm: row.created_at,
  };
}

/** Monta a cláusula WHERE + valores a partir dos filtros recebidos, para reuso entre a query de dados e a de contagem. */
function montarFiltros({ categoria, busca, estoqueBaixo }) {
  const condicoes = [];
  const valores = [];

  if (categoria) {
    valores.push(categoria);
    condicoes.push(`c.slug = $${valores.length}`);
  }

  if (busca) {
    valores.push(`%${busca}%`);
    const indice = valores.length;
    condicoes.push(`(p.name ILIKE $${indice} OR p.code ILIKE $${indice} OR p.brand ILIKE $${indice})`);
  }

  if (estoqueBaixo) {
    condicoes.push('p.stock <= 20');
  }

  const whereSql = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  return { whereSql, valores };
}

async function listar({ categoria, busca, ordenar, pagina = 1, porPagina = 12, estoqueBaixo } = {}) {
  const { whereSql, valores } = montarFiltros({ categoria, busca, estoqueBaixo });
  const ordenacaoSql = COLUNAS_ORDENACAO[ordenar] || 'p.created_at DESC';

  const paginaSegura = Math.max(1, Number(pagina) || 1);
  const limite = Math.min(48, Math.max(1, Number(porPagina) || 12));
  const offset = (paginaSegura - 1) * limite;

  const queryDados = `
    ${SELECT_BASE}
    ${whereSql}
    ORDER BY ${ordenacaoSql}
    LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}
  `;
  const queryContagem = `SELECT COUNT(*)::int AS total FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`;

  const [resultadoDados, resultadoContagem] = await Promise.all([
    pool.query(queryDados, [...valores, limite, offset]),
    pool.query(queryContagem, valores),
  ]);

  const total = resultadoContagem.rows[0].total;

  return {
    produtos: resultadoDados.rows.map(mapearProduto),
    total,
    paginaAtual: paginaSegura,
    totalPaginas: Math.max(1, Math.ceil(total / limite)),
  };
}

async function buscarPorId(id) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE p.id = $1`, [id]);
  return rows[0] ? mapearProduto(rows[0]) : null;
}

async function listarDestaques(limite = 4) {
  const { rows } = await pool.query(
    `${SELECT_BASE} WHERE p.featured = true ORDER BY p.created_at DESC LIMIT $1`,
    [limite]
  );
  return rows.map(mapearProduto);
}

async function listarRelacionados(produtoAtual, limite = 4) {
  if (!produtoAtual.categoriaId) return [];

  const { rows } = await pool.query(
    `${SELECT_BASE} WHERE p.category_id = $1 AND p.id != $2 ORDER BY p.created_at DESC LIMIT $3`,
    [produtoAtual.categoriaId, produtoAtual.id, limite]
  );
  return rows.map(mapearProduto);
}

async function criar({ codigo, nome, descricao, marca, preco, estoque, categoriaId, destaque }) {
  const { rows } = await pool.query(
    `INSERT INTO products (code, name, description, brand, price, stock, category_id, featured)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [codigo, nome, descricao || null, marca || null, preco, estoque || 0, categoriaId || null, !!destaque]
  );
  return rows[0];
}

async function atualizar(id, { codigo, nome, descricao, marca, preco, estoque, categoriaId, destaque }) {
  const { rows } = await pool.query(
    `UPDATE products SET
       code = COALESCE($2, code),
       name = COALESCE($3, name),
       description = COALESCE($4, description),
       brand = COALESCE($5, brand),
       price = COALESCE($6, price),
       stock = COALESCE($7, stock),
       category_id = COALESCE($8, category_id),
       featured = COALESCE($9, featured),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, codigo, nome, descricao, marca, preco, estoque, categoriaId, destaque]
  );
  return rows[0] || null;
}

async function excluir(id) {
  await pool.query('DELETE FROM products WHERE id = $1', [id]);
}

async function contarTodos() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM products');
  return rows[0].total;
}

async function contarEstoqueBaixo(limiteEstoque = 20) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM products WHERE stock <= $1', [limiteEstoque]);
  return rows[0].total;
}

/**
 * Usado apenas pelo sitemap.xml — retorna id/slug de todos os produtos,
 * sem o teto de 48 itens por página que listar() aplica para uso normal
 * do catálogo (paginação pensada para navegação humana, não para o mapa
 * completo do site).
 */
async function listarTodosParaSitemap() {
  const { rows } = await pool.query('SELECT id, name FROM products ORDER BY id');
  return rows.map((row) => ({ id: row.id, slug: gerarSlug(row.name) }));
}

async function existeCodigo(codigo, ignorarId = null) {
  const query = ignorarId
    ? 'SELECT id FROM products WHERE code = $1 AND id != $2'
    : 'SELECT id FROM products WHERE code = $1';
  const valores = ignorarId ? [codigo, ignorarId] : [codigo];
  const { rows } = await pool.query(query, valores);
  return rows.length > 0;
}

module.exports = {
  listar,
  buscarPorId,
  listarDestaques,
  listarRelacionados,
  criar,
  atualizar,
  excluir,
  contarTodos,
  contarEstoqueBaixo,
  existeCodigo,
  listarTodosParaSitemap,
};
