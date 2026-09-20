#!/usr/bin/env node
// Menyusun src/ menjadi satu berkas dist/index.html, lalu menyalin isi public/.
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

/** Modul JS disisipkan ke penanda yang ada di src/3-app.js (urutan menentukan urutan eksekusi). */
export const MODULES = [
  ['/*__FEATURES__*/', '4-features.js'],
  ['/*__SECURITY__*/', '5-security.js'],
  ['/*__FUN__*/', '6-fun.js'],
  ['/*__DETAIL__*/', '7-detail.js'],
  ['/*__LOGIC__*/', '8-logic.js'],
  ['/*__PLAN__*/', '9-plan.js'],
  ['/*__REVIEW__*/', '10-review.js'],
  ['/*__DESIGN__*/', '11-design.js'],
  ['/*__HOME__*/', '12-home.js'],
  ['/*__NATIVE__*/', '13-native.js'],
];

const read = (f) => readFile(path.join(SRC, f), 'utf8');

export async function build({ quiet = false } = {}) {
  const [head, body] = await Promise.all([read('1-head.html'), read('2-body.html')]);
  let app = await read('3-app.js');

  for (const [marker, file] of MODULES) {
    if (!app.includes(marker)) throw new Error(`Penanda ${marker} tidak ada di 3-app.js`);
    const code = await read(file);
    app = app.replace(marker, () => code); // fungsi: supaya "$$" di kode tidak ditafsirkan sebagai pola pengganti

  }
  const leftover = app.match(/\/\*__[A-Z]+__\*\//g);
  if (leftover) throw new Error(`Penanda belum terisi: ${leftover.join(', ')}`);

  // src/3-app.js berisi JavaScript murni; pembungkus <script> dan penutup dokumen ditambahkan di sini.
  const html = `${head}${body}<script>\n${app}</script>\n</body></html>\n`;
  checkSyntax(html);

  if (existsSync(DIST)) await rm(DIST, { recursive: true });
  await mkdir(DIST, { recursive: true });
  await writeFile(path.join(DIST, 'index.html'), html);
  await cp(path.join(ROOT, 'public'), DIST, { recursive: true });

  if (!quiet) {
    const kb = (s) => `${Math.round(Buffer.byteLength(s) / 1024)} KB`;
    console.log(`✓ dist/index.html  ${kb(html)}  (${MODULES.length + 3} berkas sumber)`);
  }
  return html;
}

/** Cek cepat: tiap blok <script> harus bisa diurai JavaScript-nya. */
function checkSyntax(html) {
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  blocks.forEach((m, i) => {
    try {
      new Function(m[1]);
    } catch (e) {
      throw new Error(`Sintaks JavaScript error di blok <script> ke-${i + 1}: ${e.message}`);
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build().catch((e) => {
    console.error('✗ Build gagal:', e.message);
    process.exit(1);
  });
}
