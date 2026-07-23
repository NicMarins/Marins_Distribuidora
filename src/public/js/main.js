// public/js/main.js
// Interações globais do site. Scripts específicos de página (catálogo,
// produto, admin) serão adicionados em arquivos próprios nas próximas etapas.

document.addEventListener('DOMContentLoaded', () => {
  inicializarMenuMobile();
  ativarFallbackImagens(document);
});

/**
 * Adiciona um fallback de imagem (troca para um placeholder em caso de
 * erro de carregamento) sem usar o atributo inline "onerror" — o CSP
 * configurado no servidor (helmet) bloqueia handlers de evento inline por
 * padrão, então o fallback precisa ser registrado via JavaScript.
 * data-fallback="/caminho/da/imagem.svg" no <img> ativa o comportamento.
 * Exposta em window para ser reutilizada por outras páginas (ex: busca
 * instantânea do catálogo, que insere imagens depois do carregamento inicial).
 */
function ativarFallbackImagens(escopo) {
  escopo.querySelectorAll('img[data-fallback]:not([data-fallback-ativo])').forEach((img) => {
    img.dataset.fallbackAtivo = 'true';
    img.addEventListener('error', () => {
      if (img.src !== img.dataset.fallback) {
        img.src = img.dataset.fallback;
      }
    });
  });
}

window.ativarFallbackImagens = ativarFallbackImagens;

/**
 * Controla a abertura/fechamento do menu de navegação em telas pequenas.
 */
function inicializarMenuMobile() {
  const botao = document.querySelector('.botao-menu-mobile');
  const cabecalho = document.querySelector('.cabecalho');

  if (!botao || !cabecalho) return;

  botao.addEventListener('click', () => {
    const aberto = cabecalho.classList.toggle('menu-aberto');
    botao.setAttribute('aria-expanded', String(aberto));
    botao.setAttribute('aria-label', aberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
  });
}
