const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'dist');
const host = '127.0.0.1';
const port = 4173;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

http
  .createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const filePath = path.join(root, relativePath);

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.statusCode = 404;
        res.end('not found');
        return;
      }

      res.setHeader(
        'Content-Type',
        mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      );
      res.end(data);
    });
  })
  .listen(port, host, () => {
    console.log(`Static dist server running at http://${host}:${port}`);
  });
