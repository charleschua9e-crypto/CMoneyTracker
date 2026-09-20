#!/usr/bin/env node
// Menjalankan semua tes Playwright (Python) satu per satu: npm test
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = path.join(ROOT, 'tests');
// Galat jaringan dari sandbox (font/CDN diblokir) bukan kegagalan aplikasi.
const IGNORE = /TUNNEL|ERR_NAME_NOT_RESOLVED|fonts\.googleapis|cdnjs/;

const only = process.argv.slice(2);
const files = (only.length ? only : readdirSync(TESTS).filter((f) => /^test\d*\.py$/.test(f)))
  .sort((a, b) => (parseInt(a.replace(/\D/g, '') || '1') - parseInt(b.replace(/\D/g, '') || '1')));

await build({ quiet: true });
console.log(`Menjalankan ${files.length} berkas tes…\n`);

let failed = 0;
for (const f of files) {
  const t0 = Date.now();
  const r = spawnSync('python3', [f], { cwd: TESTS, encoding: 'utf8', timeout: 300000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const errLine = out.match(/ERRORS: \[(.*)\]/s);
  const pageErrors = errLine
    ? errLine[1].split(/',\s*'/).map((s) => s.replace(/^'|'$/g, '')).filter((s) => s && !IGNORE.test(s))
    : [];
  const ok = r.status === 0 && !!errLine && pageErrors.length === 0;
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`${ok ? '  ✓' : '  ✗'} ${f.padEnd(12)} ${secs}s`);
  if (!ok) {
    failed++;
    if (pageErrors.length) console.log('     galat halaman:', pageErrors.join(' | '));
    if (r.status !== 0) console.log(out.trim().split('\n').slice(-12).map((l) => '     ' + l).join('\n'));
  }
}
console.log(failed ? `\n✗ ${failed} berkas tes gagal` : '\n✓ Semua tes lolos');
process.exit(failed ? 1 : 0);
