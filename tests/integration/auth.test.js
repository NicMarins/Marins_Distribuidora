// tests/integration/auth.test.js
// Testa o fluxo completo de cadastro/login com CSRF real (como um
// navegador faria), controle de acesso por papel, e casos de erro.

const request = require('supertest');
const app = require('../../src/app');

/** Extrai o valor do cookie csrfToken de uma resposta (array Set-Cookie). */
function extrairCsrfToken(resposta) {
  const cookies = resposta.headers['set-cookie'] || [];
  const linhaCsrf = cookies.find((c) => c.startsWith('csrfToken='));
  if (!linhaCsrf) return null;
  return decodeURIComponent(linhaCsrf.split(';')[0].split('=')[1]);
}

describe('Cadastro e login', () => {
  test('cadastro com dados válidos cria a conta e loga automaticamente', async () => {
    const agent = request.agent(app);

    const paginaCadastro = await agent.get('/cadastro');
    const csrfToken = extrairCsrfToken(paginaCadastro);
    expect(csrfToken).toBeTruthy();

    const resposta = await agent.post('/api/auth/cadastro').type('form').send({
      _csrf: csrfToken,
      nome: 'Cliente de Teste',
      email: `cliente.teste.${Date.now()}@exemplo.com`,
      senha: 'senhaSegura123',
      confirmarSenha: 'senhaSegura123',
      telefone: '11999999999',
    });

    expect(resposta.status).toBe(302);
    expect(resposta.headers.location).toBe('/perfil');

    // A sessão criada no cadastro já deve permitir acessar o perfil.
    const paginaPerfil = await agent.get('/perfil');
    expect(paginaPerfil.status).toBe(200);
    expect(paginaPerfil.text).toContain('Cliente de Teste');
  });

  test('cadastro é rejeitado com senha curta (validação server-side)', async () => {
    const agent = request.agent(app);
    const paginaCadastro = await agent.get('/cadastro');
    const csrfToken = extrairCsrfToken(paginaCadastro);

    const resposta = await agent.post('/api/auth/cadastro').type('form').send({
      _csrf: csrfToken,
      nome: 'Fulano',
      email: `senha.curta.${Date.now()}@exemplo.com`,
      senha: '123',
      confirmarSenha: '123',
    });

    expect(resposta.status).toBe(400);
    expect(resposta.text).toContain('8 caracteres');
  });

  test('cadastro é rejeitado sem token CSRF', async () => {
    const resposta = await request(app).post('/api/auth/cadastro').type('form').send({
      nome: 'Sem CSRF',
      email: `sem.csrf.${Date.now()}@exemplo.com`,
      senha: 'senhaSegura123',
      confirmarSenha: 'senhaSegura123',
    });

    expect(resposta.status).toBe(403);
  });

  test('login com senha errada não autentica', async () => {
    const agent = request.agent(app);

    // Cria uma conta primeiro.
    const email = `login.teste.${Date.now()}@exemplo.com`;
    const paginaCadastro = await agent.get('/cadastro');
    const csrfToken = extrairCsrfToken(paginaCadastro);

    await agent.post('/api/auth/cadastro').type('form').send({
      _csrf: csrfToken,
      nome: 'Login Teste',
      email,
      senha: 'senhaCorreta123',
      confirmarSenha: 'senhaCorreta123',
    });
    await agent.get('/logout'); // encerra a sessão criada automaticamente pelo cadastro

    // O cookie csrfToken já existe desde a 1ª requisição do agente e não é
    // reemitido em respostas seguintes — por isso reaproveitamos o mesmo
    // valor capturado acima, em vez de tentar extraí-lo de novo aqui.
    const resposta = await agent.post('/api/auth/login').type('form').send({
      _csrf: csrfToken,
      email,
      senha: 'senhaErrada',
    });

    expect(resposta.status).toBe(401);
    expect(resposta.text).toContain('E-mail ou senha inválidos');
  });

  test('login com credenciais corretas autentica e permite acessar /perfil', async () => {
    const agent = request.agent(app);
    const email = `login.ok.${Date.now()}@exemplo.com`;

    const paginaCadastro = await agent.get('/cadastro');
    const csrfToken = extrairCsrfToken(paginaCadastro);

    await agent.post('/api/auth/cadastro').type('form').send({
      _csrf: csrfToken,
      nome: 'Login OK',
      email,
      senha: 'senhaCorreta123',
      confirmarSenha: 'senhaCorreta123',
    });
    await agent.get('/logout');

    const resposta = await agent.post('/api/auth/login').type('form').send({
      _csrf: csrfToken,
      email,
      senha: 'senhaCorreta123',
    });

    expect(resposta.status).toBe(302);
    expect(resposta.headers.location).toBe('/perfil');
  });

  test('cliente comum não acessa o painel administrativo (403)', async () => {
    const agent = request.agent(app);
    const email = `cliente.sem.acesso.${Date.now()}@exemplo.com`;

    const paginaCadastro = await agent.get('/cadastro');
    await agent.post('/api/auth/cadastro').type('form').send({
      _csrf: extrairCsrfToken(paginaCadastro),
      nome: 'Cliente Comum',
      email,
      senha: 'senhaSegura123',
      confirmarSenha: 'senhaSegura123',
    });

    const resposta = await agent.get('/admin');

    expect(resposta.status).toBe(403);
  });

  test('logout encerra a sessão (volta a exigir login no /perfil)', async () => {
    const agent = request.agent(app);
    const email = `logout.teste.${Date.now()}@exemplo.com`;

    const paginaCadastro = await agent.get('/cadastro');
    await agent.post('/api/auth/cadastro').type('form').send({
      _csrf: extrairCsrfToken(paginaCadastro),
      nome: 'Logout Teste',
      email,
      senha: 'senhaSegura123',
      confirmarSenha: 'senhaSegura123',
    });

    await agent.get('/logout');
    const resposta = await agent.get('/perfil');

    expect(resposta.status).toBe(302);
    expect(resposta.headers.location).toBe('/login');
  });
});
