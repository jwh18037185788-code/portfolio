import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// A plain static file server: deliberately no SPA history fallback.
const root = fileURLToPath(new URL('../../../demos/task-agent/', import.meta.url));
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const prefix = `/${arg('--base', '/').split('/').filter(Boolean).join('/')}/`.replace('//', '/');
const port = Number(arg('--port', '4173'));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://static.invalid').pathname);
    if (prefix !== '/' && pathname === prefix.slice(0, -1)) { res.writeHead(301, { Location: prefix }); res.end(); return; }
    if (!pathname.startsWith(prefix)) throw new Error('not found');
    let path = resolve(root, pathname.slice(prefix.length) || 'index.html');
    if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) throw new Error('not found');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Static demo: http://127.0.0.1:${port}${prefix}#/bd-task`));
