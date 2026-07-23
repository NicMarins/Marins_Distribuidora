// src/models/configuracaoModel.js

const pool = require('../config/db');

let cache = null;

async function obterTodas() {
  if (cache) return cache;

  const { rows } = await pool.query('SELECT key, value FROM settings');
  // Transforma [{key, value}, ...] em { key: value, ... } para uso direto nas views.
  cache = rows.reduce((acc, linha) => {
    acc[linha.key] = linha.value;
    return acc;
  }, {});
  return cache;
}

async function definirVarias(configuracoes) {
  const entradas = Object.entries(configuracoes);

  for (const [chave, valor] of entradas) {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [chave, valor]
    );
  }

  cache = null; // invalida o cache para refletir a mudança na próxima leitura
}

module.exports = { obterTodas, definirVarias };
