// public/js/csrf.js
// Lê o token CSRF gravado pelo servidor em um cookie legível por
// JavaScript (ver src/middlewares/csrf.js) para incluí-lo no header
// X-CSRF-Token de toda chamada fetch que muda estado (POST/PUT/PATCH/DELETE).

function obterCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

window.obterCsrfToken = obterCsrfToken;
