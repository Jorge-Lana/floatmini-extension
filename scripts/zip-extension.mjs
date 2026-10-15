#!/usr/bin/env node
// Gera os pacotes da extensão a partir de extension/:
//   dist-extension/floatmini-extension-<versão>.zip  → Chrome Web Store (Chrome, Edge, Brave, Opera)
//   dist-extension/floatmini-firefox-<versão>.zip    → addons.mozilla.org (Firefox)
//
// O código é o mesmo; só o manifest muda para o Firefox (ver firefoxManifest()).
// Uso: node scripts/zip-extension.mjs [--target=chrome|firefox|all]  (padrão: all)
import JSZip from 'jszip';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extDir = path.join(repo, 'extension');
const outDir = path.join(repo, 'dist-extension');

export const FIREFOX_ID = 'floatmini@jorgelana';
// Document Picture-in-Picture chegou no Firefox 151 (desktop).
export const FIREFOX_MIN_VERSION = '151.0';

export function firefoxManifest(chromeManifest) {
  const m = structuredClone(chromeManifest);
  // Firefox (MV3) usa background scripts em vez de service worker.
  m.background = { scripts: [m.background.service_worker], type: m.background.type };
  delete m.minimum_chrome_version;
  m.browser_specific_settings = {
    gecko: {
      id: FIREFOX_ID,
      strict_min_version: FIREFOX_MIN_VERSION,
      // Exigido pelo addons.mozilla.org: a extensão não coleta dados.
      data_collection_permissions: { required: ['none'] }
    }
  };
  return m;
}

function packageFiles() {
  return readdirSync(extDir, { recursive: true })
    .map(String)
    .filter((rel) => statSync(path.join(extDir, rel)).isFile())
    .map((rel) => ({ rel: rel.split(path.sep).join('/'), data: readFileSync(path.join(extDir, rel)) }));
}

async function build(target) {
  const manifest = JSON.parse(readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
  const zip = new JSZip();
  for (const { rel, data } of packageFiles()) {
    if (rel === 'manifest.json') continue;
    zip.file(rel, data);
  }
  const finalManifest = target === 'firefox' ? firefoxManifest(manifest) : manifest;
  zip.file('manifest.json', JSON.stringify(finalManifest, null, 2) + '\n');

  mkdirSync(outDir, { recursive: true });
  const name = target === 'firefox' ? 'floatmini-firefox' : 'floatmini-extension';
  const outFile = path.join(outDir, `${name}-${manifest.version}.zip`);
  writeFileSync(outFile, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log(`✓ ${path.relative(repo, outFile)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv.find((a) => a.startsWith('--target='))?.split('=')[1] || 'all';
  const targets = arg === 'all' ? ['chrome', 'firefox'] : [arg];
  for (const t of targets) {
    if (t !== 'chrome' && t !== 'firefox') throw new Error(`target desconhecido: ${t}`);
    await build(t);
  }
}
