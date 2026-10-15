// Testes do manifest gerado para o Firefox (scripts/zip-extension.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { firefoxManifest, FIREFOX_ID, FIREFOX_MIN_VERSION } from '../scripts/zip-extension.mjs';

const chrome = JSON.parse(readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));

test('Firefox: background vira scripts (sem service worker)', () => {
  const ff = firefoxManifest(chrome);
  assert.deepEqual(ff.background.scripts, [chrome.background.service_worker]);
  assert.equal(ff.background.service_worker, undefined);
  assert.equal(ff.background.type, chrome.background.type);
});

test('Firefox: id, versão mínima e declaração de coleta de dados', () => {
  const gecko = firefoxManifest(chrome).browser_specific_settings.gecko;
  assert.equal(gecko.id, FIREFOX_ID);
  assert.equal(gecko.strict_min_version, FIREFOX_MIN_VERSION);
  assert.deepEqual(gecko.data_collection_permissions, { required: ['none'] });
});

test('Firefox: remove chaves só do Chrome e não altera o manifest original', () => {
  const before = JSON.stringify(chrome);
  const ff = firefoxManifest(chrome);
  assert.equal(ff.minimum_chrome_version, undefined);
  assert.equal(JSON.stringify(chrome), before);
  assert.deepEqual(ff.permissions, chrome.permissions);
  assert.equal(ff.version, chrome.version);
});
