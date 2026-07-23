// src/models/produtoImagemModel.js

const pool = require('../config/db');

async function adicionar(produtoId, url, posicao = 0) {
  const { rows } = await pool.query(
    'INSERT INTO product_images (product_id, url, position) VALUES ($1, $2, $3) RETURNING *',
    [produtoId, url, posicao]
  );
  return rows[0];
}

async function listarPorProduto(produtoId) {
  const { rows } = await pool.query(
    'SELECT * FROM product_images WHERE product_id = $1 ORDER BY position',
    [produtoId]
  );
  return rows;
}

async function contarPorProduto(produtoId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM product_images WHERE product_id = $1',
    [produtoId]
  );
  return rows[0].total;
}

async function excluir(id, produtoId) {
  // O segundo parâmetro garante que um usuário só consiga excluir imagens
  // do produto correto, mesmo que tente adivinhar IDs de imagem na URL.
  await pool.query('DELETE FROM product_images WHERE id = $1 AND product_id = $2', [id, produtoId]);
}

module.exports = { adicionar, listarPorProduto, contarPorProduto, excluir };
