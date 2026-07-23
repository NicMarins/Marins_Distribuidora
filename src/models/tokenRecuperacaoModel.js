// src/models/tokenRecuperacaoModel.js
// Tokens de redefinição de senha nunca são armazenados em texto puro —
// apenas o hash SHA-256 do token vai para o banco. O token bruto (enviado
// ao usuário) nunca é persistido, então mesmo um vazamento do banco não
// permite reconstruir links de redefinição válidos.

const pool = require('../config/db');
const crypto = require('crypto');

const VALIDADE_MINUTOS = 30;

async function criarToken(userId) {
  const tokenBruto = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenBruto).digest('hex');
  const expiraEm = new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000);

  await pool.query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiraEm]
  );

  return tokenBruto;
}

async function validarToken(tokenBruto) {
  const tokenHash = crypto.createHash('sha256').update(tokenBruto).digest('hex');
  const { rows } = await pool.query(
    'SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND used = false AND expires_at > NOW()',
    [tokenHash]
  );
  return rows[0] || null;
}

async function marcarComoUsado(id) {
  await pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [id]);
}

module.exports = { criarToken, validarToken, marcarComoUsado };
