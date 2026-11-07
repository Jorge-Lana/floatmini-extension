// FloatMini - sites extras (opcional): streamings, TikTok e Instagram.
//
// A extensão não roda sozinha nesses sites. Quem quiser o botão na barra do
// player e o Alt+P lá ativa pelo menu: o navegador pede a permissão só
// desses sites, e o content script passa a ser carregado neles.

export const EXTRA_ORIGINS = [
  'https://www.netflix.com/*',
  'https://www.primevideo.com/*',
  'https://www.disneyplus.com/*',
  'https://*.max.com/*',
  'https://*.hbomax.com/*',
  'https://globoplay.globo.com/*',
  'https://www.crunchyroll.com/*',
  'https://www.paramountplus.com/*',
  'https://tv.apple.com/*',
  'https://soundcloud.com/*',
  'https://www.deezer.com/*',
  'https://www.tiktok.com/*',
  'https://www.instagram.com/*'
];
const SCRIPT_ID = 'floatmini-extra-sites';
const OLD_SCRIPT_IDS = ['floatmini-feeds']; // 3.0.0

async function grantedOrigins() {
  const out = [];
  for (const origin of EXTRA_ORIGINS) {
    try {
      if (await chrome.permissions.contains({ origins: [origin] })) out.push(origin);
    } catch {
      /* ignora */
    }
  }
  return out;
}

// true quando todos os sites extras estão liberados.
export async function hasExtraPermission() {
  return (await grantedOrigins()).length === EXTRA_ORIGINS.length;
}

// Registra o content script nos sites liberados (e tira dos que não estão).
export async function syncExtraScripts() {
  const origins = await grantedOrigins();
  let registered = [];
  try {
    registered = await chrome.scripting.getRegisteredContentScripts();
  } catch {
    registered = [];
  }
  const stale = registered.filter((s) => OLD_SCRIPT_IDS.includes(s.id)).map((s) => s.id);
  const current = registered.find((s) => s.id === SCRIPT_ID);
  const same = current && JSON.stringify([...current.matches].sort()) === JSON.stringify([...origins].sort());
  if (current && !same) stale.push(SCRIPT_ID);
  if (stale.length) await chrome.scripting.unregisterContentScripts({ ids: stale });
  if (origins.length && !same) {
    await chrome.scripting.registerContentScripts([
      { id: SCRIPT_ID, matches: origins, js: ['content.js'], runAt: 'document_idle', persistAcrossSessions: true }
    ]);
  }
  return origins.length === EXTRA_ORIGINS.length;
}
