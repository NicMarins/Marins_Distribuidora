// tests/integration/paginas-publicas.test.js
// Testes de integração via supertest, contra o app Express real.
// Requerem TEST_DATABASE_URL configurada (ver tests/globalSetup.js).

const request = require('supertest');
const app = require('../../src/app');

describe('Páginas públicas', () => {
  test('GET / responde 200 e mostra o hero e produtos em destaque', async () => {
    const resposta = await request(app).get('/');

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain('Descartáveis certos, no volume certo, na hora certa.');
    expect(resposta.text).toContain('Produtos em destaque');
  });

  test('GET /catalogo responde 200 e lista todos os produtos do seed', async () => {
    const resposta = await request(app).get('/catalogo');

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain('7 produtos encontrados');
  });

  test('GET /catalogo?categoria=higiene filtra corretamente', async () => {
    const resposta = await request(app).get('/catalogo').query({ categoria: 'higiene' });

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain('2 produtos encontrados');
  });

  test('GET /catalogo?busca=inexistente-xyz não encontra nada', async () => {
    const resposta = await request(app).get('/catalogo').query({ busca: 'inexistente-xyz' });

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain('Nenhum produto encontrado');
  });

  test('GET /produto/:id mostra o produto correto (id e slug descobertos via API)', async () => {
    const busca = await request(app).get('/api/produtos').query({ busca: 'DC-1001' });
    const produto = busca.body.produtos[0];

    const resposta = await request(app).get(`/produto/${produto.id}/${produto.slug}`);

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain(produto.nome);
  });

  test('GET /produto/:id sem slug também funciona (slug é opcional)', async () => {
    const busca = await request(app).get('/api/produtos').query({ busca: 'DC-1001' });
    const produto = busca.body.produtos[0];

    const resposta = await request(app).get(`/produto/${produto.id}`);

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain(produto.nome);
  });

  test('GET /produto/:id inexistente responde 404 com a página personalizada', async () => {
    const resposta = await request(app).get('/produto/999999');

    expect(resposta.status).toBe(404);
    expect(resposta.text).toContain('404');
  });

  test('GET /rota-que-nao-existe responde 404', async () => {
    const resposta = await request(app).get('/rota-que-nao-existe');

    expect(resposta.status).toBe(404);
  });

  test('GET /sobre, /contato, /login, /cadastro respondem 200', async () => {
    const rotas = ['/sobre', '/contato', '/login', '/cadastro'];

    for (const rota of rotas) {
      const resposta = await request(app).get(rota);
      expect(resposta.status).toBe(200);
    }
  });

  test('GET /sitemap.xml responde XML válido com produtos e categorias', async () => {
    const resposta = await request(app).get('/sitemap.xml');

    expect(resposta.status).toBe(200);
    expect(resposta.headers['content-type']).toContain('xml');
    expect(resposta.text).toContain('<urlset');
    expect(resposta.text).toContain('/catalogo');
  });

  test('GET /robots.txt bloqueia áreas privadas e aponta para o sitemap', async () => {
    const resposta = await request(app).get('/robots.txt');

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain('Disallow: /admin');
    expect(resposta.text).toContain('Sitemap:');
  });

  test('/admin redireciona para o login quando não autenticado', async () => {
    const resposta = await request(app).get('/admin');

    expect(resposta.status).toBe(302);
    expect(resposta.headers.location).toBe('/login');
  });

  test('/perfil redireciona para o login quando não autenticado', async () => {
    const resposta = await request(app).get('/perfil');

    expect(resposta.status).toBe(302);
    expect(resposta.headers.location).toBe('/login');
  });
});
