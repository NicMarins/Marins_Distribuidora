// public/js/admin-categorias.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-nova-categoria');
  const mensagemErro = document.getElementById('mensagem-categoria');
  const corpoTabela = document.getElementById('corpo-tabela-categorias');

  if (form) {
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      mensagemErro.hidden = true;

      const nome = form.nome.value.trim();

      try {
        const resposta = await fetch('/api/categorias', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': window.obterCsrfToken(),
          },
          body: JSON.stringify({ nome }),
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
          const mensagens = dados.erros ? dados.erros.map((e) => e.msg).join(' ') : dados.erro;
          throw new Error(mensagens || 'Não foi possível criar a categoria.');
        }

        adicionarLinha(dados);
        form.reset();
      } catch (erro) {
        mensagemErro.textContent = erro.message;
        mensagemErro.hidden = false;
      }
    });
  }

  if (corpoTabela) {
    corpoTabela.addEventListener('click', async (evento) => {
      const botao = evento.target.closest('.botao-excluir-categoria');
      if (!botao) return;

      const confirmado = confirm('Excluir esta categoria? Produtos vinculados a ela ficarão sem categoria.');
      if (!confirmado) return;

      try {
        const resposta = await fetch(`/api/categorias/${botao.dataset.id}`, {
          method: 'DELETE',
          headers: { 'X-CSRF-Token': window.obterCsrfToken() },
        });
        if (!resposta.ok && resposta.status !== 204) {
          throw new Error('Não foi possível excluir a categoria.');
        }
        document.querySelector(`tr[data-categoria-id="${botao.dataset.id}"]`)?.remove();
      } catch (erro) {
        alert(erro.message);
      }
    });
  }

  function adicionarLinha(categoria) {
    const linha = document.createElement('tr');
    linha.dataset.categoriaId = categoria.id;
    linha.innerHTML = `
      <td>${escaparHtml(categoria.name)}</td>
      <td class="celula-mono">${escaparHtml(categoria.slug)}</td>
      <td>
        <button type="button" class="link-discreto botao-excluir-categoria" data-id="${categoria.id}" style="color: var(--cor-erro);">Excluir</button>
      </td>
    `;
    corpoTabela.appendChild(linha);
  }

  function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
  }
});
