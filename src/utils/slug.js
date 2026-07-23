// src/utils/slug.js
// Utilitário compartilhado para gerar slugs (usado por categorias e
// produtos — URLs amigáveis para SEO).

function gerarSlug(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

module.exports = { gerarSlug };
