// tests/globalSetup.js
// Roda UMA VEZ antes de toda a suíte de testes. Recria o schema do zero
// no banco de TESTES (nunca aponte TEST_DATABASE_URL para o banco de
// produção — este script apaga todos os dados do schema public).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

module.exports = async () => {
  const connectionString = process.env.TEST_DATABASE_URL;

  if (!connectionString) {
    console.warn(
      '\n[testes] TEST_DATABASE_URL não definida no .env — os testes de integração ' +
      'que dependem do banco de dados vão falhar. Configure uma string de conexão ' +
      'para um banco Postgres DESCARTÁVEL (nunca produção) antes de rodar `npm test`.\n'
    );
    return;
  }

  const pool = new Pool({ connectionString });

  try {
    // Reset completo: garante que cada execução da suíte comece do zero,
    // independentemente do que sobrou de uma rodada anterior.
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'src', 'database', 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);

    const seedSql = fs.readFileSync(path.join(__dirname, '..', 'src', 'database', 'seed.sql'), 'utf-8');
    await pool.query(seedSql);
  } finally {
    await pool.end();
  }
};
