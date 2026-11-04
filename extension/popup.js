// FloatMini - popup
import { sendToTab } from './tab-bridge.js';
import { EXTRA_ORIGINS, hasExtraPermission, syncExtraScripts } from './extra-sites.js';

const $ = (id) => document.getElementById(id);
const statusEl = $('status');

// Versão no cabeçalho (vem do manifest).
try {
  $('version').textContent = `v${chrome.runtime.getManifest().version}`;
} catch {
  /* fora da extensão (prévia) */
}

const STATUS_TEXT = {
  needs_click: 'Clique no botão azul que apareceu na página para abrir a janela.',
  no_media: 'Nenhum vídeo encontrado nesta aba.',
  failed: 'O navegador não permitiu abrir a janela flutuante nesta página.',
  not_found: 'Esse controle não existe nesta página.'
};

function showStatus(text, kind = 'info') {
  statusEl.textContent = text;
  statusEl.hidden = false;
  statusEl.dataset.kind = kind;
}

async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) throw new Error('Nenhuma aba ativa.');
  return sendToTab(tab.id, message);
}

async function run(message) {
  try {
    const status = (await sendToActiveTab(message))?.status;
    if (status === 'opened' || status === 'closed') {
      window.close();
      return;
    }
    if (status === 'needs_click') {
      showStatus(STATUS_TEXT.needs_click);
      setTimeout(() => window.close(), 1800);
      return;
    }
    if (STATUS_TEXT[status]) {
      showStatus(STATUS_TEXT[status]);
    }
  } catch {
    showStatus('Esta página não aceita extensões (ex.: chrome:// ou a loja do Chrome). Abra um site com vídeo.', 'error');
  }
}

document.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', () =>
    run({ action: btn.dataset.action, seconds: Number(btn.dataset.seconds) || 0 })
  );
});

// --- Tamanho da janela ------------------------------------------------------
const sizeButtons = document.querySelectorAll('.size-btn');

function sizeKey(pipSize) {
  return pipSize && typeof pipSize === 'object' ? `${pipSize.width}x${pipSize.height}` : 'auto';
}

function markActiveSize(key) {
  sizeButtons.forEach((b) => b.classList.toggle('active', b.dataset.size === key));
}

sizeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.size;
    const [width, height] = key.split('x').map(Number);
    chrome.storage.local.set({ pipSize: key === 'auto' ? 'auto' : { width, height } });
    markActiveSize(key);
  });
});

// --- Estado salvo -----------------------------------------------------------
chrome.storage.local.get(['pipSize'], (res) => markActiveSize(sizeKey(res.pipSize || 'auto')));

// --- Shorts, TikTok e Reels -----------------------------------------------------
const feedAuto = $('feed-auto');
chrome.storage.local.get(['feedAutoAdvance'], (res) => {
  feedAuto.checked = !!res.feedAutoAdvance;
});
feedAuto.addEventListener('change', () => chrome.storage.local.set({ feedAutoAdvance: feedAuto.checked }));

// --- Streamings, TikTok e Instagram (permissão opcional) ---------------------
const extraPerm = $('extra-perm');
function renderExtraPerm(granted) {
  extraPerm.dataset.on = String(granted);
  extraPerm.textContent = granted ? 'Ativo ✓' : 'Ativar';
  extraPerm.title = granted ? 'Clique para desativar nesses sites' : 'O navegador vai pedir permissão só para esses sites';
}
hasExtraPermission().then(renderExtraPerm);
extraPerm.addEventListener('click', async () => {
  try {
    if (extraPerm.dataset.on === 'true') {
      await chrome.permissions.remove({ origins: EXTRA_ORIGINS });
    } else {
      // O pedido precisa sair direto do clique (gesto do usuário).
      await chrome.permissions.request({ origins: EXTRA_ORIGINS });
    }
    renderExtraPerm(await syncExtraScripts());
    if (extraPerm.dataset.on === 'true') showStatus('Pronto! Recarregue a aba do site para o ícone aparecer.', 'ok');
  } catch {
    showStatus('Não foi possível mudar a permissão.', 'error');
  }
});

// --- Pedido de avaliação (uma vez, depois de alguns usos) ----------------------
const RATE_AFTER = 5;
const isFirefox = chrome.runtime.getURL('').startsWith('moz-extension:');
const RATE_URL = isFirefox
  ? 'https://addons.mozilla.org/firefox/addon/floatmini/reviews/'
  : 'https://chromewebstore.google.com/detail/iadkhoobiblaihcanofckjchegddgihh/reviews';
const rateBox = $('rate');
$('rate-link').href = RATE_URL;
chrome.storage.local.get(['floatCount', 'rateDone'], (res) => {
  rateBox.hidden = !!res.rateDone || (Number(res.floatCount) || 0) < RATE_AFTER;
});
const rateDone = () => {
  chrome.storage.local.set({ rateDone: true });
  rateBox.hidden = true;
};
$('rate-link').addEventListener('click', rateDone);
$('rate-close').addEventListener('click', rateDone);
