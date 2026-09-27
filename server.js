const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, 'public');
const productsFile = path.join(__dirname, 'data', 'products.json');

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function readProducts() {
  return JSON.parse(fs.readFileSync(productsFile, 'utf8'));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10_000) reject(new Error('Слишком большой запрос'));
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function serveStatic(response, requestPath) {
  const requestedPath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.normalize(path.join(publicDirectory, requestedPath));

  if (!filePath.startsWith(publicDirectory)) {
    sendJson(response, 403, { error: 'Доступ запрещен' });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(response, 404, { error: 'Файл не найден' });
      return;
    }

    const extension = path.extname(filePath);
    const contentTypes = {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8'
    };
    response.writeHead(200, { 'Content-Type': contentTypes[extension] || 'application/octet-stream' });
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/products') {
    try {
      sendJson(response, 200, readProducts());
    } catch (error) {
      sendJson(response, 500, { error: 'Не удалось загрузить товары' });
    }
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/products') {
    readRequestBody(request)
      .then((body) => {
        const product = JSON.parse(body);
        const name = typeof product.name === 'string' ? product.name.trim() : '';
        const category = typeof product.category === 'string' ? product.category.trim() : '';
        const price = Number(product.price);

        if (!name || !category || !Number.isFinite(price) || price <= 0) {
          sendJson(response, 400, { error: 'Укажите название, категорию и положительную цену' });
          return;
        }

        const products = readProducts();
        const newProduct = {
          id: products.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
          name,
          price,
          category
        };
        products.push(newProduct);
        fs.writeFileSync(productsFile, `${JSON.stringify(products, null, 2)}\n`);
        sendJson(response, 201, newProduct);
      })
      .catch((error) => {
        const statusCode = error instanceof SyntaxError ? 400 : 500;
        const message = statusCode === 400 ? 'Некорректный JSON' : 'Не удалось сохранить товар';
        sendJson(response, statusCode, { error: message });
      });
    return;
  }

  if (request.method === 'GET') {
    serveStatic(response, requestUrl.pathname);
    return;
  }

  sendJson(response, 405, { error: 'Метод не поддерживается' });
});

server.listen(port, () => {
  console.log(`Сервер запущен: http://localhost:${port}`);
});