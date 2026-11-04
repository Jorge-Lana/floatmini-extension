// FloatMini - TikTok e Instagram (opcional).
//
// A extensão não roda sozinha nesses sites. Quem quiser o Alt+P e o botão
// de flutuar lá ativa pelo menu: o navegador pede a permissão só desses
// dois sites, e o content script passa a ser carregado neles.

export const FEED_ORIGINS = ['https://www.tiktok.com/*', 'https://www.instagram.com/*'];
const SCRIPT_ID = 'floatmini-feeds';

export async function hasFeedPermission() {
  try {
    return await chrome.permissions.contains({ origins: FEED_ORIGINS });
  } catch {
    return false;
  }
}

// Registra ou remove o content script conforme a permissão atual.
export async function syncFeedScripts() {
  const granted = await hasFeedPermission();
  let registered = [];
  try {
    registered = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  } catch {
    registered = [];
  }
  if (granted && !registered.length) {
    await chrome.scripting.registerContentScripts([
      { id: SCRIPT_ID, matches: FEED_ORIGINS, js: ['content.js'], runAt: 'document_idle', persistAcrossSessions: true }
    ]);
  } else if (!granted && registered.length) {
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  }
  return granted;
}
