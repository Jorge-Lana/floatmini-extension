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


test('streamings, TikTok e Instagram só como permissão opcional; atalho global sugerido', async () => {
  const { EXTRA_ORIGINS } = await import('../extension/extra-sites.js');
  assert.deepEqual(chrome.optional_host_permissions, EXTRA_ORIGINS);
  assert.ok(EXTRA_ORIGINS.some((o) => o.includes('netflix')) && EXTRA_ORIGINS.some((o) => o.includes('tiktok')));
  const hosts = (chrome.content_scripts || []).flatMap((c) => c.matches);
  assert.ok(!hosts.some((h) => /tiktok|instagram|netflix/.test(h)), 'não roda sozinho nesses sites');
  assert.equal(chrome.commands['toggle-float'].suggested_key.default, 'Alt+Shift+P');
  const ff = firefoxManifest(chrome);
  assert.deepEqual(ff.optional_host_permissions, chrome.optional_host_permissions);
  assert.deepEqual(ff.commands, chrome.commands);
});

test('sites extras: registra o script só nos sites liberados e troca o registro antigo', async () => {
  const calls = [];
  let granted = new Set();
  let registered = [{ id: 'floatmini-feeds', matches: ['https://www.tiktok.com/*'] }];
  globalThis.chrome = {
    permissions: { contains: async ({ origins }) => granted.has(origins[0]) },
    scripting: {
      getRegisteredContentScripts: async () => registered,
      registerContentScripts: async (list) => {
        calls.push(['register', list[0].id, list[0].matches.length]);
        registered = [...registered, ...list];
      },
      unregisterContentScripts: async ({ ids }) => {
        calls.push(['unregister', ...ids]);
        registered = registered.filter((r) => !ids.includes(r.id));
      }
    }
  };
  const { syncExtraScripts, EXTRA_ORIGINS } = await import('../extension/extra-sites.js');
  granted = new Set(EXTRA_ORIGINS);
  assert.equal(await syncExtraScripts(), true);
  assert.equal(await syncExtraScripts(), true); // não registra duas vezes
  granted = new Set();
  assert.equal(await syncExtraScripts(), false);
  assert.deepEqual(calls, [
    ['unregister', 'floatmini-feeds'],
    ['register', 'floatmini-extra-sites', EXTRA_ORIGINS.length],
    ['unregister', 'floatmini-extra-sites']
  ]);
  delete globalThis.chrome;
});
