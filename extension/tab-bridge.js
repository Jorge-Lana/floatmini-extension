// FloatMini - ponte entre popup/background e o content script da aba.
//
// No YouTube, YouTube Music e Spotify o content script já está carregado
// (manifest > content_scripts). Em qualquer outro site ele é injetado sob
// demanda, usando a permissão activeTab, que o Chrome concede quando o
// usuário abre o popup, usa o menu de contexto ou um atalho da extensão.

export async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Content script ausente nesta aba: injeta e tenta de novo.
    // Falha de propósito em páginas protegidas (chrome://, Chrome Web Store).
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    return await chrome.tabs.sendMessage(tabId, message);
  }
}
