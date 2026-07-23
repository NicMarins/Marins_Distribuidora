// src/routes/usuarios.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { autenticarApi, autorizar } = require('../middlewares/auth');
const { upload, manipularErroUpload } = require('../middlewares/upload');
const usuarioController = require('../controllers/usuarioController');

router.post(
  '/perfil',
  autenticarApi,
  [body('email').optional().isEmail().withMessage('Informe um e-mail válido.').normalizeEmail()],
  usuarioController.atualizarPerfil
);
router.post(
  '/senha',
  autenticarApi,
  [body('novaSenha').isLength({ min: 8 }).withMessage('A nova senha deve ter no mínimo 8 caracteres.')],
  usuarioController.alterarSenha
);
router.post(
  '/avatar',
  autenticarApi,
  upload.single('avatar'),
  manipularErroUpload,
  usuarioController.atualizarAvatar
);

// --- Administração ---
router.patch(
  '/:id/papel',
  autenticarApi,
  autorizar('administrador'),
  usuarioController.atualizarPapelAdmin
);
router.delete('/:id', autenticarApi, autorizar('administrador'), usuarioController.excluirAdmin);

module.exports = router;
