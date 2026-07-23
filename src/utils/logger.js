// src/utils/logger.js
// Log de erros simples, sem dependências externas: grava uma linha JSON
// por erro em logs/error.log, além de manter o console.error (útil para
// acompanhar em tempo real durante o desenvolvimento ou via `journalctl`/
// painel do provedor de hospedagem em produção).
//
// Não registramos o corpo da requisição (req.body) para evitar gravar
// senhas ou outros dados sensíveis em texto puro no log.

const fs = require('fs');
const path = require('path');

const PASTA_LOGS = path.join(__dirname, '..', '..', 'logs');
const ARQUIVO_LOG = path.join(PASTA_LOGS, 'error.log');

function registrarErro(err, req) {
  console.error(err.stack || err.message || err);

  try {
    fs.mkdirSync(PASTA_LOGS, { recursive: true });

    const entrada = {
      data: new Date().toISOString(),
      metodo: req?.method,
      rota: req?.originalUrl,
      usuarioId: req?.usuario?.id || null,
      mensagem: err.message,
      stack: err.stack,
    };

    fs.appendFileSync(ARQUIVO_LOG, `${JSON.stringify(entrada)}\n`);
  } catch (erroAoLogar) {
    // Se nem o log der certo, apenas avisamos no console — não podemos
    // deixar uma falha de log derrubar o tratamento do erro original.
    console.error('Falha ao gravar log de erro:', erroAoLogar.message);
  }
}

module.exports = { registrarErro };
