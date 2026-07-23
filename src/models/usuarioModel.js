// src/models/usuarioModel.js
// Todas as queries usam parâmetros ($1, $2...) em vez de concatenação de
// strings — isso é o que efetivamente previne SQL Injection no driver `pg`.

const pool = require('../config/db');

/**
 * Busca completa (inclui password_hash). Uso interno apenas — nunca
 * repassar o resultado direto para uma view ou resposta de API.
 */
async function buscarComSenhaPorEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function buscarComSenhaPorId(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

/** Busca segura (sem password_hash) para exibir em perfil/admin. */
async function buscarPorId(id) {
  const { rows } = await pool.query(
    'SELECT id, name, email, phone, role, avatar_url, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function criar({ nome, email, senhaHash, telefone }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, phone, role)
     VALUES ($1, $2, $3, $4, 'cliente')
     RETURNING id, name, email, phone, role, created_at`,
    [nome, email, senhaHash, telefone || null]
  );
  return rows[0];
}

async function atualizarPerfil(id, { nome, email, telefone }) {
  const { rows } = await pool.query(
    `UPDATE users
     SET name = COALESCE($2, name),
         email = COALESCE($3, email),
         phone = COALESCE($4, phone),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, email, phone, role`,
    [id, nome || null, email || null, telefone || null]
  );
  return rows[0];
}

async function atualizarSenha(id, senhaHash) {
  await pool.query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [id, senhaHash]);
}

async function atualizarAvatar(id, avatarUrl) {
  const { rows } = await pool.query(
    'UPDATE users SET avatar_url = $2, updated_at = NOW() WHERE id = $1 RETURNING avatar_url',
    [id, avatarUrl]
  );
  return rows[0];
}

// --- Administração (painel admin) ---

async function listarTodos() {
  const { rows } = await pool.query(
    'SELECT id, name, email, phone, role, avatar_url, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}

async function atualizarPapel(id, papel) {
  const { rows } = await pool.query(
    'UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role',
    [id, papel]
  );
  return rows[0] || null;
}

async function excluir(id) {
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
}

module.exports = {
  buscarComSenhaPorEmail,
  buscarComSenhaPorId,
  buscarPorId,
  criar,
  atualizarPerfil,
  atualizarSenha,
  atualizarAvatar,
  listarTodos,
  atualizarPapel,
  excluir,
};
