// scripts/build.js
// Minifica os arquivos de /src/public/css e /src/public/js para
// /src/public/dist, mantendo os originais intactos (usados em
// desenvolvimento, onde ler o código sem minificar facilita depuração).
//
// Rode com `npm run build` antes de subir para produção — ou configure o
// "Build Command" do seu serviço de hospedagem (Render/Railway) como:
//   npm install && npm run build

const fs = require('fs');
const path = require('path');
const { minify: minifyJs } = require('terser');
const CleanCSS = require('clean-css');

const PASTA_PUBLIC = path.join(__dirname, '..', 'src', 'public');
const PASTA_CSS = path.join(PASTA_PUBLIC, 'css');
const PASTA_JS = path.join(PASTA_PUBLIC, 'js');
const PASTA_DIST_CSS = path.join(PASTA_PUBLIC, 'dist', 'css');
const PASTA_DIST_JS = path.join(PASTA_PUBLIC, 'dist', 'js');

async function buildCss() {
  fs.mkdirSync(PASTA_DIST_CSS, { recursive: true });
  const arquivos = fs.readdirSync(PASTA_CSS).filter((f) => f.endsWith('.css'));

  for (const arquivo of arquivos) {
    const origem = fs.readFileSync(path.join(PASTA_CSS, arquivo), 'utf-8');
    const resultado = new CleanCSS({ level: 2 }).minify(origem);

    if (resultado.errors.length) {
      throw new Error(`Erro ao minificar ${arquivo}: ${resultado.errors.join(', ')}`);
    }

    const nomeSaida = arquivo.replace(/\.css$/, '.min.css');
    fs.writeFileSync(path.join(PASTA_DIST_CSS, nomeSaida), resultado.styles);

    const reducao = (100 * (1 - resultado.stats.efficiency)).toFixed(0);
    console.log(`CSS: ${arquivo} -> dist/css/${nomeSaida} (${resultado.stats.originalSize}B -> ${resultado.stats.minifiedSize}B)`);
  }
}

async function buildJs() {
  fs.mkdirSync(PASTA_DIST_JS, { recursive: true });
  const arquivos = fs.readdirSync(PASTA_JS).filter((f) => f.endsWith('.js'));

  for (const arquivo of arquivos) {
    const origem = fs.readFileSync(path.join(PASTA_JS, arquivo), 'utf-8');
    const resultado = await minifyJs(origem, {
      compress: true,
      mangle: true,
      format: { comments: false },
    });

    if (!resultado.code) {
      throw new Error(`Falha ao minificar ${arquivo}`);
    }

    const nomeSaida = arquivo.replace(/\.js$/, '.min.js');
    fs.writeFileSync(path.join(PASTA_DIST_JS, nomeSaida), resultado.code);
    console.log(`JS: ${arquivo} -> dist/js/${nomeSaida} (${origem.length}B -> ${resultado.code.length}B)`);
  }
}

async function main() {
  console.log('Iniciando build de assets (CSS/JS) para produção...\n');
  await buildCss();
  await buildJs();
  console.log('\nBuild concluído. Os arquivos minificados estão em src/public/dist/.');
}

main().catch((erro) => {
  console.error('Falha no build:', erro);
  process.exit(1);
});
