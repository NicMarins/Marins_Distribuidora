// tests/integration/admin-produtos.test.js
// Testa o CRUD de produtos autenticado como administrador. Como não existe
// uma forma pública de virar administrador, promovemos o usuário de teste
// diretamente no banco (mesma alternativa documentada no README para uso
// real do painel).

const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

function extrairCsrfToken(resposta) {
  const cookies = resposta.headers['set-cookie'] || [];
  const linha = cookies.find((c) => c.startsWith('csrfToken='));
  return linha ? decodeURIComponent(linha.split(';')[0].split('=')[1]) : null;
}

async function criarAgenteAdministrador() {
  const agent = request.agent(app);
  const email = `admin.teste.${Date.now()}@exemplo.com`;

  const paginaCadastro = await agent.get('/cadastro');
  // Importante: o cookie csrfToken só vem em Set-Cookie na requisição que o
  // CRIA. Chamadas seguintes do mesmo agente reenviam o cookie já salvo,
  // mas não re-emitem Set-Cookie — por isso capturamos o valor aqui e o
  // reaproveitamos em todas as chamadas seguintes, em vez de tentar
  // "reler" o token de respostas futuras.
  const csrfToken = extrairCsrfToken(paginaCadastro);

  await agent.post('/api/auth/cadastro').type('form').send({
    _csrf: csrfToken,
    nome: 'Admin de Teste',
    email,
    senha: 'senhaSegura123',
    confirmarSenha: 'senhaSegura123',
  });

  await pool.query("UPDATE users SET role = 'administrador' WHERE email = $1", [email]);

  // A sessão (JWT) criada no cadastro ainda carrega o papel antigo
  // ('cliente'), então é preciso logar de novo para obter um token com o
  // papel atualizado — do mesmo jeito que aconteceria com um usuário real.
  await agent.get('/logout');
  await agent.post('/api/auth/login').type('form').send({
    _csrf: csrfToken,
    email,
    senha: 'senhaSegura123',
  });

  return { agent, csrfToken };
}

describe('CRUD de produtos (administrador)', () => {
  let agent;
  let csrfToken;

  beforeAll(async () => {
    ({ agent, csrfToken } = await criarAgenteAdministrador());
  });

  test('cria um novo produto', async () => {
    const resposta = await agent
      .post('/api/produtos')
      .set('X-CSRF-Token', csrfToken)
      .send({
        codigo: `TESTE-${Date.now()}`,
        nome: 'Produto Criado Pelo Teste',
        preco: 19.9,
        estoque: 50,
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.name).toBe('Produto Criado Pelo Teste');
  });

  test('rejeita criação com preço inválido', async () => {
    const resposta = await agent
      .post('/api/produtos')
      .set('X-CSRF-Token', csrfToken)
      .send({
        codigo: `TESTE-INVALIDO-${Date.now()}`,
        nome: 'Produto Inválido',
        preco: -10,
      });

    expect(resposta.status).toBe(400);
  });

  test('rejeita código de produto duplicado', async () => {
    const codigo = `TESTE-DUP-${Date.now()}`;

    await agent.post('/api/produtos').set('X-CSRF-Token', csrfToken).send({
      codigo,
      nome: 'Primeiro produto',
      preco: 10,
    });

    const resposta = await agent.post('/api/produtos').set('X-CSRF-Token', csrfToken).send({
      codigo,
      nome: 'Segundo produto com código repetido',
      preco: 20,
    });

    expect(resposta.status).toBe(409);
  });

  test('atualiza e depois exclui um produto', async () => {
    const criado = await agent.post('/api/produtos').set('X-CSRF-Token', csrfToken).send({
      codigo: `TESTE-EDIT-${Date.now()}`,
      nome: 'Produto Para Editar',
      preco: 15,
      estoque: 5,
    });

    const id = criado.body.id;

    const atualizado = await agent
      .put(`/api/produtos/${id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ preco: 25.5 });

    expect(atualizado.status).toBe(200);
    expect(Number(atualizado.body.price)).toBe(25.5);

    const exclusao = await agent.delete(`/api/produtos/${id}`).set('X-CSRF-Token', csrfToken);
    expect(exclusao.status).toBe(204);

    const buscaAposExclusao = await request(app).get(`/produto/${id}`);
    expect(buscaAposExclusao.status).toBe(404);
  });
});

describe('CRUD de produtos sem ser administrador', () => {
  test('funcionário consegue criar produto, mas não excluir (excluir é só admin)', async () => {
    const agent = request.agent(app);
    const email = `funcionario.teste.${Date.now()}@exemplo.com`;

    const paginaCadastro = await agent.get('/cadastro');
    const csrfToken = extrairCsrfToken(paginaCadastro);

    await agent.post('/api/auth/cadastro').type('form').send({
      _csrf: csrfToken,
      nome: 'Funcionário Teste',
      email,
      senha: 'senhaSegura123',
      confirmarSenha: 'senhaSegura123',
    });

    await pool.query("UPDATE users SET role = 'funcionario' WHERE email = $1", [email]);
    await agent.get('/logout');
    await agent.post('/api/auth/login').type('form').send({
      _csrf: csrfToken,
      email,
      senha: 'senhaSegura123',
    });

    const criado = await agent.post('/api/produtos').set('X-CSRF-Token', csrfToken).send({
      codigo: `TESTE-FUNC-${Date.now()}`,
      nome: 'Produto Criado Por Funcionário',
      preco: 12,
    });
    expect(criado.status).toBe(201);

    const exclusao = await agent.delete(`/api/produtos/${criado.body.id}`).set('X-CSRF-Token', csrfToken);
    expect(exclusao.status).toBe(403);
  });

  test('visitante não autenticado não consegue criar produto', async () => {
    const resposta = await request(app).post('/api/produtos').send({
      codigo: 'TESTE-SEM-AUTH',
      nome: 'Não Deveria Existir',
      preco: 10,
    });

    // Bloqueado pelo CSRF antes mesmo de chegar na checagem de autenticação.
    expect([401, 403]).toContain(resposta.status);
  });
});

afterAll(async () => {
  await pool.end();
});
