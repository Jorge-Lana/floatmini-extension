// FloatMini - service worker (Manifest V3)
import { sendToTab } from './tab-bridge.js';

const MENU_ID = 'floatmini-toggle';

// Abas abertas pelo "abrir link numa janela compacta" que devem mostrar o
// convite "Clique para flutuar" assim que carregarem.
const tabsAwaitingPrompt = new Set();

chrome.runtime.onInstalled.addListener(() => {
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action !== 'OPEN_IN_COMPACT_WINDOW') return false;
  openCompactWindow(message).then(sendResponse, (err) =>
    sendResponse({ error: String(err?.message || err) })
  );
  return true; // resposta assíncrona
});

async function openCompactWindow({ url, width = 520, height = 420 }) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Só links http(s) são aceitos.');
  }
  // Uma janela popup do Chrome NÃO fica sempre no topo. Ela só serve para
  // abrir o site num tamanho compacto; o "sempre no topo" de verdade vem do
  // Document Picture-in-Picture, que o content script abre após um clique.
  const win = await chrome.windows.create({
    url: parsed.href,
    type: 'popup',
    width: Math.round(width),
    height: Math.round(height),
    focused: true
  });
  const tabId = win.tabs?.[0]?.id;
  if (tabId !== undefined) tabsAwaitingPrompt.add(tabId);
  return { windowId: win.id };
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete' || !tabsAwaitingPrompt.has(tabId)) return;
  tabsAwaitingPrompt.delete(tabId);
  // Só funciona onde o content script já roda (YouTube, YT Music, Spotify).
  chrome.tabs.sendMessage(tabId, { action: 'SHOW_FLOAT_PROMPT' }).catch(() => {});
});

chrome.tabs.onRemoved.addListener((tabId) => tabsAwaitingPrompt.delete(tabId));
