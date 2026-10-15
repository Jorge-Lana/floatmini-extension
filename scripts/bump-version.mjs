#!/usr/bin/env node
// Atualiza a versão em extension/manifest.json e package.json.
// Uso: npm run version:set -- 1.3.4
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version || '')) {
  console.error('Uso: npm run version:set -- X.Y.Z   (ex.: 1.3.4)');
  process.exit(1);
}

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const rel of ['extension/manifest.json', 'package.json']) {
  const file = path.join(repo, rel);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const old = json.version;
  json.version = version;
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`✓ ${rel}: ${old} → ${version}`);
}
console.log(`\nPróximos passos:\n  git commit -am "chore: versão ${version}"\n  git tag v${version}\n  git push && git push origin v${version}`);
