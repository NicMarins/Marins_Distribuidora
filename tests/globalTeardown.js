// tests/globalTeardown.js
// Roda uma vez após toda a suíte terminar. O pool de conexões usado pela
// aplicação (src/config/db.js) é fechado aqui para o processo do Jest
// conseguir encerrar sozinho, sem handles abertos pendurados.

module.exports = async () => {
  try {
    const pool = require('../src/config/db');
    await pool.end();
  } catch (erro) {
    // Se o pool nunca foi usado (ex: TEST_DATABASE_URL ausente), não há o
    // que fechar — não é um erro real.
  }
};
