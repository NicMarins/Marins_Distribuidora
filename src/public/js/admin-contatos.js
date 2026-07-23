// public/js/admin-contatos.js

document.addEventListener('DOMContentLoaded', () => {
  const lista = document.getElementById('lista-contatos');
  if (!lista) return;

  lista.addEventListener('click', async (evento) => {
    const botao = evento.target.closest('.botao-marcar-lido');
    if (!botao) return;

    const id = botao.dataset.id;

    try {
      const resposta = await fetch(`/api/contato/${id}/lido`, {
        method: 'PATCH',
        headers: { 'X-CSRF-Token': window.obterCsrfToken() },
      });
      if (!resposta.ok && resposta.status !== 204) {
        throw new Error('Não foi possível marcar como lido.');
      }

      const cartao = document.querySelector(`[data-contato-id="${id}"]`);
      cartao.classList.remove('cartao-contato--nao-lido');
      cartao.querySelector('.etiqueta-nao-lido')?.remove();
      botao.remove();
    } catch (erro) {
      alert(erro.message);
    }
  });
});
