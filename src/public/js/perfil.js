// public/js/perfil.js
// Controla o upload de foto de perfil sem recarregar a página inteira:
// o clique no botão abre o seletor de arquivo, e o envio é feito via
// fetch para /api/usuarios/avatar (que responde em JSON).

document.addEventListener('DOMContentLoaded', () => {
  const botao = document.getElementById('botao-alterar-foto');
  const input = document.getElementById('input-avatar');
  const preview = document.getElementById('avatar-preview');

  if (!botao || !input || !preview) return;

  botao.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const arquivo = input.files[0];
    if (!arquivo) return;

    const formData = new FormData();
    formData.append('avatar', arquivo);

    botao.textContent = 'Enviando...';
    botao.disabled = true;

    try {
      const resposta = await fetch('/api/usuarios/avatar', {
        method: 'POST',
        headers: { 'X-CSRF-Token': window.obterCsrfToken() },
        body: formData,
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível enviar a imagem.');
      }

      preview.src = dados.avatarUrl;
    } catch (erro) {
      alert(erro.message);
    } finally {
      botao.textContent = 'Alterar foto';
      botao.disabled = false;
    }
  });
});
