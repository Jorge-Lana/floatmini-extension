#!/usr/bin/env node
// Verificações estáticas da extensão em extension/.
// Pega os erros que fazem a extensão quebrar no navegador sem aviso:
// arquivo referenciado que não existe, script inline bloqueado pelo CSP do
// Manifest V3, API do Chrome usada sem a permissão, erro de sintaxe.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'extension');
const errors = [];
const fail = (msg) => errors.push(msg);
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => existsSync(path.join(root, rel));

// --- manifest ----------------------------------------------------------------
let manifest;
try {
  manifest = JSON.parse(read('manifest.json'));
} catch (err) {
  console.error(`✗ manifest.json inválido: ${err.message}`);
  process.exit(1);
}

if (manifest.manifest_version !== 3) fail('manifest_version precisa ser 3');
for (const key of ['name', 'version', 'description']) {
  if (!manifest[key]) fail(`manifest.json sem "${key}"`);
}

const VALID_PERMISSIONS = new Set([
  'activeTab', 'alarms', 'bookmarks', 'clipboardRead', 'clipboardWrite', 'contextMenus', 'cookies',
  'declarativeNetRequest', 'declarativeNetRequestWithHostAccess', 'downloads', 'history', 'identity',
  'idle', 'notifications', 'offscreen', 'scripting', 'sidePanel', 'storage', 'tabGroups', 'tabs',
  'unlimitedStorage', 'webNavigation', 'webRequest'
]);
const permissions = new Set(manifest.permissions || []);
for (const p of permissions) {
  if (!VALID_PERMISSIONS.has(p)) fail(`permissão desconhecida no manifest: "${p}"`);
}

// --- arquivos referenciados pelo manifest -----------------------------------
const referenced = new Set();
const add = (file) => file && referenced.add(file);
add(manifest.background?.service_worker);
add(manifest.action?.default_popup);
Object.values(manifest.icons || {}).forEach(add);
Object.values(manifest.action?.default_icon || {}).forEach(add);
for (const cs of manifest.content_scripts || []) {
  (cs.js || []).forEach(add);
  (cs.css || []).forEach(add);
}
for (const file of referenced) {
  if (!exists(file)) fail(`manifest.json aponta para "${file}", que não existe`);
}

// --- arquivos JS e HTML -------------------------------------------------------
const allFiles = readdirSync(root, { recursive: true }).map(String);
const jsFiles = allFiles.filter((f) => f.endsWith('.js'));
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));

for (const html of htmlFiles) {
  const src = read(html);
  for (const match of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const [, attrs, body] = match;
    if (!/\bsrc\s*=/.test(attrs) && body.trim()) {
      fail(`${html}: <script> inline é bloqueado pelo CSP do Manifest V3; mova para um arquivo .js`);
    }
    const srcAttr = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/);
    if (srcAttr && !srcAttr[1].includes('://') && !exists(path.join(path.dirname(html), srcAttr[1]))) {
      fail(`${html}: script "${srcAttr[1]}" não existe`);
    }
  }
  const inlineHandler = src.match(/<[^>]+\s(on[a-z]+)\s*=/i);
  if (inlineHandler) {
    fail(`${html}: atributo ${inlineHandler[1]}="..." é bloqueado pelo CSP; use addEventListener`);
  }
  for (const m of src.matchAll(/<link\b[^>]*href\s*=\s*["']([^"']+)["']/gi)) {
    if (!m[1].includes('://') && !exists(path.join(path.dirname(html), m[1]))) {
      fail(`${html}: arquivo "${m[1]}" não existe`);
    }
  }
}

const API_PERMISSIONS = {
  'chrome.contextMenus': 'contextMenus',
  'chrome.storage': 'storage',
  'chrome.scripting': 'scripting',
  'chrome.alarms': 'alarms',
  'chrome.notifications': 'notifications',
  'chrome.downloads': 'downloads',
  'chrome.offscreen': 'offscreen'
};

for (const file of jsFiles) {
  const src = read(file);
  try {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
  } catch (err) {
    fail(`${file}: erro de sintaxe\n${String(err.stderr || err.message).trim()}`);
  }
  for (const [api, permission] of Object.entries(API_PERMISSIONS)) {
    if (src.includes(`${api}.`) && !permissions.has(permission)) {
      fail(`${file} usa ${api} mas o manifest não declara a permissão "${permission}"`);
    }
  }
  for (const m of src.matchAll(/\bimport\s[^'"]*from\s*['"](\.[^'"]+)['"]/g)) {
    if (!exists(path.join(path.dirname(file), m[1]))) fail(`${file}: import "${m[1]}" não existe`);
  }
  if (/\bfiles:\s*\[([^\]]+)\]/.test(src)) {
    for (const f of src.match(/\bfiles:\s*\[([^\]]+)\]/)[1].match(/['"]([^'"]+)['"]/g) || []) {
      const name = f.slice(1, -1);
      if (!exists(name)) fail(`${file}: executeScript aponta para "${name}", que não existe`);
    }
  }
}

const sw = manifest.background?.service_worker;
if (sw && exists(sw) && /^\s*import\s/m.test(read(sw)) && manifest.background.type !== 'module') {
  fail('background usa import, então o manifest precisa de "background": { "type": "module" }');
}

// --- resultado ---------------------------------------------------------------
if (errors.length) {
  console.error(`✗ Extensão com ${errors.length} problema(s):\n`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}
console.log(`✓ Extensão OK (${jsFiles.length} scripts, ${htmlFiles.length} página(s), ${referenced.size} arquivos referenciados)`);
