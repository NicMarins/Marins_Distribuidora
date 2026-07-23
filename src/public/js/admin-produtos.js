// public/js/admin-produtos.js

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.botao-excluir-produto').forEach((botao) => {
    botao.addEventListener('click', async () => {
      const id = botao.dataset.id;
      const confirmado = confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.');
      if (!confirmado) return;

      try {
        const resposta = await fetch(`/api/produtos/${id}`, {
          method: 'DELETE',
          headers: { 'X-CSRF-Token': window.obterCsrfToken() },
        });

        if (resposta.status === 403) {
          alert('Apenas administradores podem excluir produtos.');
          return;
        }

        if (!resposta.ok && resposta.status !== 204) {
          throw new Error('Não foi possível excluir o produto.');
        }

        document.querySelector(`tr[data-produto-id="${id}"]`)?.remove();
      } catch (erro) {
        alert(erro.message);
      }
    });
  });
});
