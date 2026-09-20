#!/usr/bin/env node
// Menaikkan nomor versi di semua tempat: npm run release -- 44
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const next = Number(process.argv[2]);
if (!Number.isInteger(next)) {
  console.error('Pakai: npm run release -- 44');
  process.exit(1);
}
const prev = next - 1;
const edits = [
  ['public/sw.js', `cmoneytracker-v${prev}`, `cmoneytracker-v${next}`],
  ['src/2-body.html', `CMoney Tracker v${prev}`, `CMoney Tracker v${next}`],
  ['src/6-fun.js', `cmoneytracker-whatsnew-v${prev}`, `cmoneytracker-whatsnew-v${next}`],
  ['src/9-plan.js', `cmoneytracker-whatsnew-v${prev}`, `cmoneytracker-whatsnew-v${next}`],
];
for (const [file, from, to] of edits) {
  const p = path.join(ROOT, file);
  const s = await readFile(p, 'utf8');
  if (!s.includes(from)) { console.warn(`! "${from}" tidak ditemukan di ${file}`); continue; }
  await writeFile(p, s.split(from).join(to));
  console.log(`✓ ${file}: ${from} → ${to}`);
}
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
pkg.version = `${next}.0.0`;
await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`✓ package.json: ${pkg.version}`);
console.log('\nJangan lupa: isi "Yang baru" di src/2-body.html (#newsSheet) dan CHANGELOG.md.');
