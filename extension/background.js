// FloatMini - service worker (Manifest V3)
import { sendToTab } from './tab-bridge.js';
import { syncExtraScripts } from './extra-sites.js';

const MENU_ID = 'floatmini-toggle';

// Streamings, TikTok e Instagram: mantém o content script de acordo com a permissão.
const syncFeeds = () => syncExtraScripts().catch((err) => console.warn('[FloatMini] sites extras:', err?.message || err));
chrome.runtime.onStartup?.addListener(syncFeeds);
chrome.permissions?.onAdded?.addListener(syncFeeds);
chrome.permissions?.onRemoved?.addListener(syncFeeds);

chrome.runtime.onInstalled.addListener(() => {
  syncFeeds();
  // removeAll evita o erro de id duplicado quando a extensão é atualizada.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Abrir na janela flutuante (FloatMini)',
      contexts: ['page', 'video', 'audio']
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab?.id !== undefined) {
    forward(tab.id, { action: 'TOGGLE_FLOAT' });
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (tab?.id === undefined) return;
  if (command === 'toggle-float') forward(tab.id, { action: 'TOGGLE_FLOAT' });
});

function forward(tabId, message) {
  sendToTab(tabId, message).catch((err) => {
    console.warn('[FloatMini] Não foi possível falar com a aba:', err?.message || err);
  });
}

// Netflix: a ponte com o player (avançar/voltar sem travar) roda no mundo
// da página. Quando o content script foi carregado pelos sites extras, ele
// pede a ponte aqui.
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.action !== 'INJECT_PAGE_BRIDGE' || sender.tab?.id === undefined) return false;
  chrome.scripting
    .executeScript({ target: { tabId: sender.tab.id }, files: ['page-bridge.js'], world: 'MAIN' })
    .catch(() => {});
  return false;
});
