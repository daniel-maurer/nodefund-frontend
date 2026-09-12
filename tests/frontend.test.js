const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { server } = require('../dev-server');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEST_PORT = 3099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

test.before(async () => {
  await new Promise((resolve) => {
    server.listen(TEST_PORT, '127.0.0.1', resolve);
  });
});

test.after(async () => {
  await new Promise((resolve) => {
    server.close(resolve);
  });
});

test('Frontend Files - integridade da estrutura HTML, CSS e JS', () => {
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'index.html')), 'index.html deve existir');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'css', 'style.css')), 'css/style.css deve existir');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'css', 'variables.css')), 'css/variables.css deve existir');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'js', 'app.js')), 'js/app.js deve existir');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'js', 'services', 'api.js')), 'js/services/api.js deve existir');

  const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
  assert.ok(html.includes('dribbble-frame'), 'HTML deve conter a moldura principal');
  assert.ok(html.includes('dribbble-sidebar'), 'HTML deve conter a barra lateral');
  assert.ok(html.includes('btn-mobile-menu'), 'HTML deve conter o botão hambúrguer');
});

test('Frontend CSS - variáveis de design tokens declaradas em :root', () => {
  const varsCss = fs.readFileSync(path.join(ROOT_DIR, 'css', 'variables.css'), 'utf-8');
  assert.ok(varsCss.includes('--charcoal:'), 'Token --charcoal deve estar definido');
  assert.ok(varsCss.includes('--mint:'), 'Token --mint deve estar definido');
  assert.ok(varsCss.includes('--peach:'), 'Token --peach deve estar definido');
  assert.ok(varsCss.includes('--sky:'), 'Token --sky deve estar definido');
  assert.ok(varsCss.includes('--radius-frame:'), 'Token --radius-frame deve estar definido');
});

test('Dev Server - carrega arquivos estáticos com MIME types corretos', async () => {
  const resHtml = await fetch(`${BASE_URL}/`);
  assert.strictEqual(resHtml.status, 200);
  assert.ok(resHtml.headers.get('content-type').includes('text/html'));

  const resCss = await fetch(`${BASE_URL}/css/style.css`);
  assert.strictEqual(resCss.status, 200);
  assert.ok(resCss.headers.get('content-type').includes('text/css'));

  const resVars = await fetch(`${BASE_URL}/css/variables.css`);
  assert.strictEqual(resVars.status, 200);
  assert.ok(resVars.headers.get('content-type').includes('text/css'));

  const resJs = await fetch(`${BASE_URL}/js/app.js`);
  assert.strictEqual(resJs.status, 200);
  assert.ok(resJs.headers.get('content-type').includes('application/javascript'));
});
