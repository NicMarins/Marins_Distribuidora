// public/js/catalogo.js
// Implementa busca instantânea (via API) e histórico de pesquisas (via
// localStorage) na página de catálogo. A busca por navegação normal
// (submit do formulário) continua funcionando sem JavaScript — isto é
// apenas uma camada de melhoria progressiva por cima da versão renderizada
// no servidor (importante para SEO e para quem tem JS desabilitado).

const CHAVE_HISTORICO = 'descartecerto:historico-busca';
const MAX_HISTORICO = 6;

document.addEventListener('DOMContentLoaded', () => {
  const formulario = document.getElementById('form-busca-catalogo');
  const campoBusca = document.getElementById('busca-catalogo');
  const areaResultados = document.getElementById('area-resultados');
  const contagem = document.getElementById('contagem-resultados');
  const divHistorico = document.getElementById('historico-busca');

  if (!formulario || !campoBusca) return;

  let temporizador = null;

  campoBusca.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      buscarInstantaneo(campoBusca.value.trim());
    }, 350);
  });

  campoBusca.addEventListener('focus', () => {
    if (!campoBusca.value) {
      mostrarHistorico();
    }
  });

  document.addEventListener('click', (evento) => {
    if (!divHistorico.contains(evento.target) && evento.target !== campoBusca) {
      divHistorico.hidden = true;
    }
  });

  formulario.addEventListener('submit', () => {
    salvarNoHistorico(campoBusca.value.trim());
  });

  async function buscarInstantaneo(termo) {
    divHistorico.hidden = true;

    const params = new URLSearchParams(window.location.search);
    if (termo) {
      params.set('busca', termo);
    } else {
      params.delete('busca');
    }
    params.delete('pagina'); // nova busca sempre volta para a primeira página

    try {
      const resposta = await fetch(`/api/produtos?${params.toString()}`);
      if (!resposta.ok) return;

      const dados = await resposta.json();
      renderizarResultados(dados);

      // Atualiza a URL sem recarregar a página, para manter o filtro compartilhável.
      const novaUrl = `/catalogo${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', novaUrl);

      if (termo) salvarNoHistorico(termo);
    } catch (erro) {
      // Falha silenciosa: em caso de erro de rede, o usuário ainda pode
      // usar o botão "Buscar" para uma busca tradicional via navegação.
      console.error('Falha na busca instantânea:', erro);
    }
  }

  function renderizarResultados(dados) {
    const { produtos, total } = dados;

    contagem.textContent = `${total} produto${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`;

    if (produtos.length === 0) {
      areaResultados.innerHTML = `
        <div class="cartao-perfurado">
          <h2 style="font-size: 1.1rem;">Nenhum produto encontrado</h2>
          <p style="color: var(--cor-tinta-suave); margin-bottom: 0;">
            Tente buscar por outro termo ou remova os filtros aplicados.
          </p>
        </div>
      `;
      return;
    }

    areaResultados.innerHTML = `<div class="grade-produtos" id="grade-produtos">${produtos
      .map(criarCartaoHtml)
      .join('')}</div>`;

    window.ativarFallbackImagens?.(areaResultados);
  }

  function criarCartaoHtml(produto) {
    const imagem = produto.imagens[0];
    const precoFormatado = Number(produto.preco).toFixed(2).replace('.', ',');
    const estoqueBaixo = produto.estoque <= 20;

    return `
      <article class="cartao-produto">
        <a href="/produto/${produto.id}/${produto.slug}" class="cartao-produto__link">
          <div class="cartao-produto__imagem">
            <img src="${imagem}" alt="${escaparHtml(produto.nome)}" loading="lazy" data-fallback="/images/placeholder-produto.svg">
            ${estoqueBaixo ? '<span class="etiqueta-estoque etiqueta-estoque--baixo">Últimas unidades</span>' : ''}
          </div>
          <div class="cartao-produto__info">
            <span class="cartao-produto__codigo">${escaparHtml(produto.codigo)}</span>
            <h3 class="cartao-produto__nome">${escaparHtml(produto.nome)}</h3>
            <span class="cartao-produto__marca">${escaparHtml(produto.marca || '')}</span>
            <strong class="cartao-produto__preco">R$ ${precoFormatado}</strong>
          </div>
        </a>
      </article>
    `;
  }

  function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  function obterHistorico() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_HISTORICO)) || [];
    } catch {
      return [];
    }
  }

  function salvarNoHistorico(termo) {
    if (!termo) return;
    let historico = obterHistorico().filter((item) => item.toLowerCase() !== termo.toLowerCase());
    historico.unshift(termo);
    historico = historico.slice(0, MAX_HISTORICO);
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
  }

  function mostrarHistorico() {
    const historico = obterHistorico();
    if (historico.length === 0) return;

    divHistorico.innerHTML = historico
      .map((termo) => `<button type="button" class="historico-busca__item">${escaparHtml(termo)}</button>`)
      .join('');
    divHistorico.hidden = false;

    divHistorico.querySelectorAll('.historico-busca__item').forEach((botao) => {
      botao.addEventListener('click', () => {
        campoBusca.value = botao.textContent;
        divHistorico.hidden = true;
        buscarInstantaneo(botao.textContent);
      });
    });
  }
});
