/**
 * Servidor de Desenvolvimento e Proxy para o Frontend (nodefund)
 * Distributed Node Architecture
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const API_URL = process.env.API_URL || 'http://127.0.0.1:8000';
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function serveStatic(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Não Encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

function proxyApi(req, res) {
  const target = new URL(req.url, API_URL);
  
  const options = {
    hostname: target.hostname,
    port: target.port,
    path: target.pathname + target.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: target.host
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy Error] Falha ao conectar ao BFF (${API_URL}):`, err.message);
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      error: 'BFF Offline',
      message: `Não foi possível conectar ao BFF em ${API_URL}. Certifique-se de que o backend-bff está rodando.`
    }));
  });

  req.pipe(proxyReq, { end: true });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = parsedUrl.pathname;

  // 1. Roteamento de API -> Proxy para o BFF
  if (pathname.startsWith('/api/')) {
    proxyApi(req, res);
    return;
  }

  // 2. Roteamento de Arquivos Estáticos
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const filePath = path.join(BASE_DIR, pathname);

  // Segurança contra Directory Traversal
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Acesso Negado');
    return;
  }

  serveStatic(req, res, filePath);
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================================');
    console.log(' nodefund · Frontend Repository');
    console.log(` Servidor local: http://localhost:${PORT}`);
    console.log(` Proxy para BFF: ${API_URL}`);
    console.log('========================================================');
  });
}

module.exports = { server, PORT, API_URL };
