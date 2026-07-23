// tests/unit/csrf.test.js
// Testa a lógica do middleware CSRF isoladamente, com objetos req/res
// simulados — não depende de Express real, servidor ou banco de dados.

const { gerarTokenCsrf, verificarCsrf } = require('../../src/middlewares/csrf');

function criarRespostaMock() {
  const res = {
    locals: {},
    statusCode: null,
    jsonChamadoCom: null,
    renderChamadoCom: null,
    cookieChamadoCom: null,
  };
  res.cookie = (nome, valor, opcoes) => {
    res.cookieChamadoCom = { nome, valor, opcoes };
  };
  res.status = (codigo) => {
    res.statusCode = codigo;
    return res;
  };
  res.json = (corpo) => {
    res.jsonChamadoCom = corpo;
    return res;
  };
  res.render = (view, dados) => {
    res.renderChamadoCom = { view, dados };
    return res;
  };
  return res;
}

describe('gerarTokenCsrf', () => {
  test('cria um cookie novo (64 caracteres hex) quando não existe nenhum token', () => {
    const req = { cookies: {} };
    const res = criarRespostaMock();
    const next = jest.fn();

    gerarTokenCsrf(req, res, next);

    expect(res.cookieChamadoCom.nome).toBe('csrfToken');
    expect(res.cookieChamadoCom.valor).toHaveLength(64);
    expect(res.cookieChamadoCom.opcoes.httpOnly).toBe(false);
    expect(res.locals.csrfToken).toBe(res.cookieChamadoCom.valor);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('reaproveita o token já existente no cookie, sem criar outro', () => {
    const req = { cookies: { csrfToken: 'token-existente' } };
    const res = criarRespostaMock();
    const next = jest.fn();

    gerarTokenCsrf(req, res, next);

    expect(res.cookieChamadoCom).toBeNull();
    expect(res.locals.csrfToken).toBe('token-existente');
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('verificarCsrf', () => {
  test('deixa passar métodos seguros (GET) mesmo sem nenhum token', () => {
    const req = { method: 'GET', cookies: {} };
    const res = criarRespostaMock();
    const next = jest.fn();

    verificarCsrf(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  test('bloqueia POST sem nenhum token com 403', () => {
    const req = { method: 'POST', cookies: {}, body: {}, get: () => undefined, accepts: () => 'json' };
    const res = criarRespostaMock();
    const next = jest.fn();

    verificarCsrf(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('bloqueia POST quando o token enviado não bate com o do cookie', () => {
    const req = {
      method: 'POST',
      cookies: { csrfToken: 'a'.repeat(64) },
      body: { _csrf: 'b'.repeat(64) },
      get: () => undefined,
      accepts: () => 'json',
    };
    const res = criarRespostaMock();
    const next = jest.fn();

    verificarCsrf(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('permite POST quando o token do corpo (_csrf) bate com o cookie', () => {
    const token = 'x'.repeat(64);
    const req = {
      method: 'POST',
      cookies: { csrfToken: token },
      body: { _csrf: token },
      get: () => undefined,
      accepts: () => 'json',
    };
    const res = criarRespostaMock();
    const next = jest.fn();

    verificarCsrf(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  test('permite POST quando o token vem pelo header X-CSRF-Token', () => {
    const token = 'y'.repeat(64);
    const req = {
      method: 'POST',
      cookies: { csrfToken: token },
      body: {},
      get: (nome) => (nome === 'X-CSRF-Token' ? token : undefined),
      accepts: () => 'json',
    };
    const res = criarRespostaMock();
    const next = jest.fn();

    verificarCsrf(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('responde JSON quando o cliente aceita JSON', () => {
    const req = { method: 'DELETE', cookies: {}, body: {}, get: () => undefined, accepts: () => 'json' };
    const res = criarRespostaMock();
    const next = jest.fn();

    verificarCsrf(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonChamadoCom.erro).toMatch(/CSRF/);
    expect(res.renderChamadoCom).toBeNull();
  });

  test('renderiza a página de erro quando o cliente aceita HTML', () => {
    const req = { method: 'POST', cookies: {}, body: {}, get: () => undefined, accepts: () => 'html' };
    const res = criarRespostaMock();
    const next = jest.fn();

    verificarCsrf(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.renderChamadoCom.view).toBe('erro');
    expect(res.jsonChamadoCom).toBeNull();
  });
});
