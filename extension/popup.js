// FloatMini - popup
import { sendToTab } from './tab-bridge.js';

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

$('btn-float').addEventListener('click', () => run({ action: 'TOGGLE_FLOAT' }));

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
let currentPipSize = 'auto';

chrome.storage.local.get(['pipSize'], (res) => {
  currentPipSize = res.pipSize || 'auto';
  markActiveSize(sizeKey(currentPipSize));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.pipSize) currentPipSize = changes.pipSize.newValue || 'auto';
});

// --- Abrir link -------------------------------------------------------------
$('url-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const raw = $('url-input').value.trim();
  let url;
  try {
    url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
  } catch {
    showStatus('Cole um link completo começando com https://', 'error');
    return;
  }
  const size = currentPipSize && typeof currentPipSize === 'object' ? currentPipSize : { width: 480, height: 270 };
  // Espaço extra para a barra de título e a interface do site.
  const res = await chrome.runtime.sendMessage({
    action: 'OPEN_IN_COMPACT_WINDOW',
    url: url.href,
    width: Math.max(420, size.width + 40),
    height: Math.max(360, size.height + 150)
  });
  if (res?.error) showStatus(res.error, 'error');
  else window.close();
});
