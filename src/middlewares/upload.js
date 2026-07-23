// src/middlewares/upload.js
// Upload seguro de imagens: valida tipo/tamanho com multer (em memória,
// nunca grava o arquivo bruto do usuário em disco), depois recomprime e
// redimensiona com sharp antes de salvar — isso também neutraliza a
// maioria dos arquivos maliciosos disfarçados de imagem, pois o sharp só
// consegue processar imagens de fato válidas.

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAX_BYTES = (Number(process.env.MAX_UPLOAD_SIZE_MB) || 5) * 1024 * 1024;

const armazenamentoEmMemoria = multer.memoryStorage();

const upload = multer({
  storage: armazenamentoEmMemoria,
  limits: { fileSize: TAMANHO_MAX_BYTES },
  fileFilter: (req, file, callback) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      return callback(new Error('Formato de imagem não suportado. Use JPEG, PNG ou WebP.'));
    }
    callback(null, true);
  },
});

/**
 * Processa o buffer recebido do multer e salva em disco já comprimido.
 * Gera sempre um nome de arquivo aleatório (nunca usa o nome original
 * enviado pelo usuário, o que evita path traversal e colisões).
 *
 * @param {Buffer} buffer - conteúdo do arquivo (req.file.buffer)
 * @param {string} pastaDestino - subpasta dentro de /src/uploads (ex: 'avatars', 'produtos')
 * @param {{ largura?: number, qualidade?: number }} opcoes
 * @returns {Promise<string>} caminho público da imagem (ex: /uploads/avatars/xxx.webp)
 */
async function salvarImagemProcessada(buffer, pastaDestino, opcoes = {}) {
  const { largura = 800, qualidade = 80 } = opcoes;

  const nomeArquivo = `${crypto.randomBytes(16).toString('hex')}.webp`;
  const caminhoPasta = path.join(__dirname, '..', 'uploads', pastaDestino);
  fs.mkdirSync(caminhoPasta, { recursive: true });
  const caminhoCompleto = path.join(caminhoPasta, nomeArquivo);

  await sharp(buffer)
    .resize({ width: largura, withoutEnlargement: true })
    .webp({ quality: qualidade })
    .toFile(caminhoCompleto);

  return `/uploads/${pastaDestino}/${nomeArquivo}`;
}

/**
 * Middleware de erro (4 parâmetros — assim o Express só o invoca quando o
 * multer chama next(err), por exemplo arquivo grande demais ou tipo não
 * permitido). Sem isso, o erro cairia no handler global de erros da
 * aplicação, que renderiza uma página HTML — quebrando o fetch do
 * navegador, que espera uma resposta JSON.
 */
function manipularErroUpload(err, req, res, next) {
  if (err) {
    return res.status(400).json({ erro: err.message || 'Falha no upload do arquivo.' });
  }
  next();
}

module.exports = { upload, salvarImagemProcessada, manipularErroUpload };
