// jest.config.js
// --runInBand (definido no script "test" do package.json) é importante
// aqui: os testes de integração compartilham um único banco de teste, e
// rodar em paralelo poderia fazer um teste interferir nos dados de outro.

module.exports = {
  testEnvironment: 'node',
  globalSetup: './tests/globalSetup.js',
  globalTeardown: './tests/globalTeardown.js',
  testTimeout: 15000,
  verbose: true,
};
