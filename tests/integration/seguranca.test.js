// tests/integration/seguranca.test.js

const request = require('supertest');
const app = require('../../src/app');

describe('Cabeçalhos de segurança (helmet)', () => {
  test('esconde o cabeçalho X-Powered-By', async () => {
    const resposta = await request(app).get('/');
    expect(resposta.headers['x-powered-by']).toBeUndefined();
  });

  test('define X-Content-Type-Options: nosniff', async () => {
    const resposta = await request(app).get('/');
    expect(resposta.headers['x-content-type-options']).toBe('nosniff');
  });

  test('define uma Content-Security-Policy restritiva (sem unsafe-inline em script-src)', async () => {
    const resposta = await request(app).get('/');
    const csp = resposta.headers['content-security-policy'];
    expect(csp).toBeDefined();

    const scriptSrc = csp.split(';').find((diretiva) => diretiva.trim().startsWith('script-src'));
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain('unsafe-inline');
  });
});

describe('Proteção CSRF em requisições reais', () => {
  test('POST /api/contato sem token CSRF é rejeitado com 403', async () => {
    const resposta = await request(app).post('/api/contato').type('form').send({
      nome: 'Visitante',
      email: 'visitante@exemplo.com',
      mensagem: 'Mensagem sem token CSRF, deveria ser bloqueada.',
    });

    expect(resposta.status).toBe(403);
  });

  test('POST /api/contato com token CSRF válido é aceito', async () => {
    const agent = request.agent(app);
    const pagina = await agent.get('/contato');
    const cookies = pagina.headers['set-cookie'] || [];
    const linhaCsrf = cookies.find((c) => c.startsWith('csrfToken='));
    const csrfToken = decodeURIComponent(linhaCsrf.split(';')[0].split('=')[1]);

    const resposta = await agent.post('/api/contato').type('form').send({
      _csrf: csrfToken,
      nome: 'Visitante',
      email: 'visitante@exemplo.com',
      mensagem: 'Mensagem de teste com token CSRF válido.',
    });

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain('Mensagem enviada');
  });
});

describe('Rate limiting', () => {
  test('bloqueia após muitas tentativas de login (limite de 20/15min)', async () => {
    const agent = request.agent(app);
    const pagina = await agent.get('/login');
    const cookies = pagina.headers['set-cookie'] || [];
    const linhaCsrf = cookies.find((c) => c.startsWith('csrfToken='));
    const csrfToken = decodeURIComponent(linhaCsrf.split(';')[0].split('=')[1]);

    let ultimaResposta;
    for (let i = 0; i < 21; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      ultimaResposta = await agent.post('/api/auth/login').type('form').send({
        _csrf: csrfToken,
        email: 'inexistente@exemplo.com',
        senha: 'qualquercoisa',
      });
    }

    expect(ultimaResposta.status).toBe(429);
  });
});

describe('Validação de upload de imagem', () => {
  test('rejeita upload de avatar sem token CSRF nem autenticação (CSRF é checado primeiro)', async () => {
    const resposta = await request(app)
      .post('/api/usuarios/avatar')
      .attach('avatar', Buffer.from('conteudo-fake'), 'foto.png');

    expect(resposta.status).toBe(403);
  });

  test('rejeita upload de avatar autenticado via CSRF mas sem sessão válida (401)', async () => {
    const agent = request.agent(app);
    const pagina = await agent.get('/login');
    const cookies = pagina.headers['set-cookie'] || [];
    const linhaCsrf = cookies.find((c) => c.startsWith('csrfToken='));
    const csrfToken = decodeURIComponent(linhaCsrf.split(';')[0].split('=')[1]);

    const resposta = await agent
      .post('/api/usuarios/avatar')
      .set('X-CSRF-Token', csrfToken)
      .attach('avatar', Buffer.from('conteudo-fake'), 'foto.png');

    expect(resposta.status).toBe(401);
  });
});
