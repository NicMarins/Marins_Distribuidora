// src/routes/contato.js

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { autenticarApi, autorizar } = require('../middlewares/auth');
const contatoController = require('../controllers/contatoController');

// Rota pública e sem autenticação — precisa de um limite próprio para não
// virar um vetor de spam (diferente do limite geral, compartilhado por
// toda a aplicação).
const limitadorContato = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas mensagens enviadas. Aguarde alguns minutos antes de tentar novamente.' },
});

router.post(
  '/',
  limitadorContato,
  [
    body('nome').trim().notEmpty().withMessage('Informe seu nome.'),
    body('email').isEmail().withMessage('Informe um e-mail válido.'),
    body('mensagem').trim().notEmpty().withMessage('Escreva uma mensagem.'),
  ],
  contatoController.enviar
);

router.get('/', autenticarApi, autorizar('administrador', 'funcionario'), contatoController.listar);
router.patch('/:id/lido', autenticarApi, autorizar('administrador', 'funcionario'), contatoController.marcarLido);

module.exports = router;
