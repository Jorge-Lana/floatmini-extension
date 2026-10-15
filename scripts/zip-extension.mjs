#!/usr/bin/env node
// Gera dist-extension/floatmini-extension-<versão>.zip a partir de extension/,
// pronto para enviar à Chrome Web Store ou distribuir.
import JSZip from 'jszip';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extDir = path.join(repo, 'extension');
const outDir = path.join(repo, 'dist-extension');

const { version } = JSON.parse(readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
const zip = new JSZip();

for (const rel of readdirSync(extDir, { recursive: true }).map(String)) {
  const abs = path.join(extDir, rel);
  if (statSync(abs).isFile()) zip.file(rel.split(path.sep).join('/'), readFileSync(abs));
}

mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `floatmini-extension-${version}.zip`);
writeFileSync(outFile, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
console.log(`✓ ${path.relative(repo, outFile)}`);
