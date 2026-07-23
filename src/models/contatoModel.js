// src/models/contatoModel.js

const pool = require('../config/db');

async function criar({ nome, email, telefone, mensagem }) {
  const { rows } = await pool.query(
    `INSERT INTO contacts (name, email, phone, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [nome, email, telefone || null, mensagem]
  );
  return rows[0];
}

async function listarTodos() {
  const { rows } = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
  return rows;
}

async function marcarComoLido(id) {
  await pool.query('UPDATE contacts SET read = true WHERE id = $1', [id]);
}

module.exports = { criar, listarTodos, marcarComoLido };
