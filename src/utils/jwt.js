// src/utils/jwt.js
// Wrapper simples sobre jsonwebtoken para centralizar a criação e
// verificação de tokens de sessão.

const jwt = require('jsonwebtoken');

function gerarToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function verificarToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { gerarToken, verificarToken };
