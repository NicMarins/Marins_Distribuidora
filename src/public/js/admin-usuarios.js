// public/js/admin-usuarios.js

document.addEventListener('DOMContentLoaded', () => {
  const corpoTabela = document.getElementById('corpo-tabela-usuarios');
  if (!corpoTabela) return;

  corpoTabela.addEventListener('change', async (evento) => {
    const seletor = evento.target.closest('.seletor-papel');
    if (!seletor) return;

    const id = seletor.dataset.id;
    const papelAnterior = seletor.dataset.papelAnterior || seletor.value;
    const novoPapel = seletor.value;

    try {
      const resposta = await fetch(`/api/usuarios/${id}/papel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': window.obterCsrfToken(),
        },
        body: JSON.stringify({ papel: novoPapel }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível alterar o nível de acesso.');
      }

      seletor.dataset.papelAnterior = novoPapel;
    } catch (erro) {
      alert(erro.message);
      seletor.value = papelAnterior; // reverte a seleção em caso de erro
    }
  });

  corpoTabela.addEventListener('click', async (evento) => {
    const botao = evento.target.closest('.botao-excluir-usuario');
    if (!botao) return;

    const id = botao.dataset.id;
    const confirmado = confirm('Excluir este usuário? Esta ação não pode ser desfeita.');
    if (!confirmado) return;

    try {
      const resposta = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': window.obterCsrfToken() },
      });

      if (!resposta.ok && resposta.status !== 204) {
        const dados = await resposta.json().catch(() => ({}));
        throw new Error(dados.erro || 'Não foi possível excluir o usuário.');
      }

      document.querySelector(`tr[data-usuario-id="${id}"]`)?.remove();
    } catch (erro) {
      alert(erro.message);
    }
  });
});
