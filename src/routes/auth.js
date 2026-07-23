// src/routes/auth.js

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const authController = require('../controllers/authController');

// Limite mais rígido que o geral (definido em app.js) especificamente para
// rotas de autenticação — mitiga ataques de força bruta contra login e
// enumeração de contas via cadastro/recuperação de senha. A Etapa 7
// (Segurança) fará uma revisão completa de todos os limites do sistema.
const limitadorAutenticacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' },
});

router.post(
  '/cadastro',
  limitadorAutenticacao,
  [
    body('nome').trim().notEmpty().withMessage('Informe seu nome.'),
    body('email').isEmail().withMessage('Informe um e-mail válido.').normalizeEmail(),
    body('senha').isLength({ min: 8 }).withMessage('A senha deve ter no mínimo 8 caracteres.'),
  ],
  authController.cadastrar
);

router.post('/login', limitadorAutenticacao, authController.login);
router.post('/recuperar-senha', limitadorAutenticacao, authController.solicitarRecuperacao);
router.post(
  '/redefinir-senha',
  limitadorAutenticacao,
  [body('senha').isLength({ min: 8 }).withMessage('A senha deve ter no mínimo 8 caracteres.')],
  authController.redefinirSenha
);

module.exports = router;
