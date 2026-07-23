// server.js
// Ponto de entrada da aplicação. Mantido separado de app.js para permitir
// testes automatizados importarem "app" sem precisar subir um servidor real.

require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
