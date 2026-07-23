// src/controllers/seoController.js
// Gera sitemap.xml dinamicamente (sempre reflete os produtos/categorias
// reais do banco) e serve o robots.txt.

const produtoModel = require('../models/produtoModel');
const categoriaModel = require('../models/categoriaModel');

const PAGINAS_ESTATICAS = [
  { caminho: '/', prioridade: '1.0', frequencia: 'daily' },
  { caminho: '/catalogo', prioridade: '0.9', frequencia: 'daily' },
  { caminho: '/sobre', prioridade: '0.5', frequencia: 'monthly' },
  { caminho: '/contato', prioridade: '0.5', frequencia: 'monthly' },
  { caminho: '/politica-de-privacidade', prioridade: '0.2', frequencia: 'yearly' },
  { caminho: '/termos-de-uso', prioridade: '0.2', frequencia: 'yearly' },
];

async function sitemap(req, res) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const [produtos, categorias] = await Promise.all([
    produtoModel.listarTodosParaSitemap(),
    categoriaModel.listarTodas(),
  ]);

  const urlsEstaticas = PAGINAS_ESTATICAS.map(
    (p) => `
  <url>
    <loc>${baseUrl}${p.caminho}</loc>
    <changefreq>${p.frequencia}</changefreq>
    <priority>${p.prioridade}</priority>
  </url>`
  );

  const urlsCategorias = categorias.map(
    (cat) => `
  <url>
    <loc>${baseUrl}/catalogo?categoria=${encodeURIComponent(cat.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
  );

  const urlsProdutos = produtos.map(
    (produto) => `
  <url>
    <loc>${baseUrl}/produto/${produto.id}/${produto.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlsEstaticas.join('')}${urlsCategorias.join('')}${urlsProdutos.join('')}
</urlset>`;

  res.set('Content-Type', 'application/xml');
  res.send(xml);
}

function robots(req, res) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const conteudo = `User-agent: *
Disallow: /admin
Disallow: /perfil
Disallow: /api
Disallow: /login
Disallow: /cadastro
Disallow: /recuperar-senha
Disallow: /redefinir-senha
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

  res.set('Content-Type', 'text/plain');
  res.send(conteudo);
}

module.exports = { sitemap, robots };
