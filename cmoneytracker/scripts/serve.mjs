#!/usr/bin/env node
// Server statis sederhana untuk mencoba hasil build: npm run dev
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8000;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };

await build();
http.createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(DIST, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('404');
  }
}).listen(PORT, () => console.log(`▶ http://localhost:${PORT}`));
