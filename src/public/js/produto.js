// public/js/produto.js
// Controla a troca de imagem principal ao clicar nas miniaturas da
// galeria de produto.

document.addEventListener('DOMContentLoaded', () => {
  const imagemPrincipal = document.getElementById('imagem-principal');
  const miniaturas = document.querySelectorAll('.miniatura');

  if (!imagemPrincipal || miniaturas.length === 0) return;

  miniaturas.forEach((miniatura) => {
    miniatura.addEventListener('click', () => {
      const novaImagem = miniatura.getAttribute('data-imagem');
      imagemPrincipal.src = novaImagem;

      miniaturas.forEach((m) => m.classList.remove('miniatura--ativa'));
      miniatura.classList.add('miniatura--ativa');
    });
  });

  // Zoom simples: amplia a imagem principal ao passar o mouse (desktop).
  imagemPrincipal.addEventListener('click', () => {
    imagemPrincipal.classList.toggle('imagem-principal--zoom');
  });
});
