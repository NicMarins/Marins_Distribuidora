// public/js/admin-produto-form.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-produto');
  const mensagemErro = document.getElementById('mensagem-form-produto');

  if (form) {
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      mensagemErro.hidden = true;

      const modo = form.dataset.modo;
      const id = form.dataset.id;

      const dados = {
        codigo: form.codigo.value.trim(),
        nome: form.nome.value.trim(),
        descricao: form.descricao.value.trim(),
        marca: form.marca.value.trim(),
        preco: form.preco.value,
        estoque: form.estoque.value,
        categoriaId: form.categoriaId.value || null,
        destaque: form.destaque.checked,
      };

      const url = modo === 'criar' ? '/api/produtos' : `/api/produtos/${id}`;
      const metodo = modo === 'criar' ? 'POST' : 'PUT';

      try {
        const resposta = await fetch(url, {
          method: metodo,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': window.obterCsrfToken(),
          },
          body: JSON.stringify(dados),
        });

        const corpo = await resposta.json();

        if (!resposta.ok) {
          const mensagens = corpo.erros ? corpo.erros.map((e) => e.msg).join(' ') : corpo.erro;
          throw new Error(mensagens || 'Não foi possível salvar o produto.');
        }

        if (modo === 'criar') {
          // Redireciona para a tela de edição, onde é possível adicionar imagens.
          window.location.href = `/admin/produtos/${corpo.id}/editar`;
        } else {
          window.location.reload();
        }
      } catch (erro) {
        mensagemErro.textContent = erro.message;
        mensagemErro.hidden = false;
      }
    });
  }

  inicializarGaleria();
});

function inicializarGaleria() {
  const galeria = document.getElementById('galeria-admin');
  const inputImagens = document.getElementById('input-imagens-produto');

  if (!galeria || !inputImagens) return;

  const produtoId = galeria.dataset.produtoId;

  inputImagens.addEventListener('change', async () => {
    const arquivos = inputImagens.files;
    if (!arquivos.length) return;

    const formData = new FormData();
    Array.from(arquivos).forEach((arquivo) => formData.append('imagens', arquivo));

    try {
      const resposta = await fetch(`/api/produtos/${produtoId}/imagens`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': window.obterCsrfToken() },
        body: formData,
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível enviar as imagens.');
      }

      dados.forEach((imagem) => adicionarImagemNaGaleria(galeria, imagem));
    } catch (erro) {
      alert(erro.message);
    } finally {
      inputImagens.value = '';
    }
  });

  galeria.addEventListener('click', async (evento) => {
    const botao = evento.target.closest('.galeria-admin__remover');
    if (!botao) return;

    const imagemId = botao.dataset.imagemId;
    const confirmado = confirm('Remover esta imagem do produto?');
    if (!confirmado) return;

    try {
      const resposta = await fetch(`/api/produtos/${produtoId}/imagens/${imagemId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': window.obterCsrfToken() },
      });
      if (!resposta.ok && resposta.status !== 204) {
        throw new Error('Não foi possível remover a imagem.');
      }
      botao.closest('.galeria-admin__item').remove();
    } catch (erro) {
      alert(erro.message);
    }
  });
}

function adicionarImagemNaGaleria(galeria, imagem) {
  const item = document.createElement('div');
  item.className = 'galeria-admin__item';
  item.dataset.imagemId = imagem.id;
  item.innerHTML = `
    <img src="${imagem.url}" alt="">
    <button type="button" class="galeria-admin__remover" data-imagem-id="${imagem.id}" aria-label="Remover esta imagem">✕</button>
  `;
  galeria.appendChild(item);
}
