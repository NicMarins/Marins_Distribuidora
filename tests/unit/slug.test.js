// tests/unit/slug.test.js
// Teste unitário puro — não depende de banco de dados nem do servidor.

const { gerarSlug } = require('../../src/utils/slug');

describe('gerarSlug', () => {
  test('converte para minúsculas e troca espaços por hífen', () => {
    expect(gerarSlug('Copos e Talheres')).toBe('copos-e-talheres');
  });

  test('remove acentos', () => {
    expect(gerarSlug('Higiene & Limpeza Doméstica')).toBe('higiene-limpeza-domestica');
  });

  test('remove hífens extras no início e no fim', () => {
    expect(gerarSlug('  -Produto Teste- ')).toBe('produto-teste');
  });

  test('mantém números', () => {
    expect(gerarSlug('Copo 200ml')).toBe('copo-200ml');
  });

  test('remove pontuação e símbolos', () => {
    expect(gerarSlug('Saco de Lixo 100L!!!')).toBe('saco-de-lixo-100l');
  });

  test('nunca retorna string com espaços', () => {
    const resultado = gerarSlug('Um Nome Qualquer De Produto');
    expect(resultado).not.toMatch(/\s/);
  });
});
