// src/models/categoriaModel.js

const pool = require('../config/db');
const { gerarSlug } = require('../utils/slug');

async function listarTodas() {
  const { rows } = await pool.query('SELECT id, name, slug FROM categories ORDER BY name');
  return rows;
}

async function buscarPorSlug(slug) {
  const { rows } = await pool.query('SELECT id, name, slug FROM categories WHERE slug = $1', [slug]);
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await pool.query('SELECT id, name, slug FROM categories WHERE id = $1', [id]);
  return rows[0] || null;
}

async function criar(nome) {
  const slug = gerarSlug(nome);
  const { rows } = await pool.query(
    'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug',
    [nome, slug]
  );
  return rows[0];
}

async function excluir(id) {
  await pool.query('DELETE FROM categories WHERE id = $1', [id]);
}

module.exports = { listarTodas, buscarPorSlug, buscarPorId, criar, excluir, gerarSlug };
