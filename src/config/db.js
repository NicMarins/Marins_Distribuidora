// src/config/db.js
// Configuração da conexão com o PostgreSQL usando um pool de conexões.
// O pool reaproveita conexões abertas, o que é essencial para performance
// em produção (evita abrir/fechar conexão a cada requisição).

const { Pool } = require('pg');
require('dotenv').config();

// O Jest define NODE_ENV=test automaticamente. Isso permite rodar a suíte
// de testes contra um banco descartável, sem qualquer risco de tocar nos
// dados de desenvolvimento ou produção.
const connectionString =
  process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

// Alguns provedores de banco na nuvem (Neon, Render, Railway) exigem SSL
// mesmo em desenvolvimento — a própria connection string já vem com
// "?sslmode=require". Antes, este projeto só ativava SSL quando
// NODE_ENV=production, o que quebrava a conexão ao rodar `npm run dev`
// contra um banco desses provedores. Agora detectamos isso automaticamente.
const exigeSsl =
  process.env.NODE_ENV === 'production' ||
  (connectionString || '').includes('sslmode=require') ||
  (connectionString || '').includes('neon.tech');

const pool = new Pool({
  connectionString,
  ssl: exigeSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  // Loga erros inesperados de conexões ociosas no pool, sem derrubar o app.
  console.error('Erro inesperado no pool do PostgreSQL:', err);
});

module.exports = pool;
