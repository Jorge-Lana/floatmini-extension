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

// --- Idiomas (pt é o padrão do HTML; en e es trocam os textos) -----------------
const POPUP_I18N = {
  en: {
    sub: 'Always-on-top floating window',
    hint: 'To float: the <svg class="inline-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg> icon in the player bar, <kbd>Alt</kbd> <kbd>P</kbd> on the page, <kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>P</kbd> on any site or right-click → <em>Open in floating window</em>.',
    quick: 'Quick controls',
    back10: 'Back 10 seconds',
    fwd10: 'Forward 10 seconds',
    shuffleTip: 'Shuffle (YT Music, Spotify, YouTube playlists)',
    shuffle: 'Shuffle',
    repeatTip: "Cycles the site's repeat modes",
    repeat: 'Repeat',
    size: 'Video window size',
    autoTip: 'Last size used',
    medium: 'Medium',
    large: 'Large',
    autoAdvance: 'Auto-advance when the video ends',
    extraTitle: 'More sites',
    extraText: 'Player-bar icon and <kbd>Alt</kbd> <kbd>P</kbd> also on streaming and music sites, TikTok and Instagram.',
    rateQ: 'Enjoying FloatMini?',
    rateLink: 'Rate it ★',
    rateClose: "Don't show again",
    openSource: 'Open source',
    report: 'Report a problem',
    supportTip: 'Support FloatMini on Buy Me a Coffee',
    support: 'Support the project',
    enable: 'Enable',
    enabled: 'On ✓',
    enableTip: 'The browser will ask permission only for these sites',
    disableTip: 'Click to turn off on these sites',
    readyReload: 'Done! Reload the site tab to see the icon.',
    permError: 'Could not change the permission.'
  },
  es: {
    sub: 'Ventana flotante siempre visible',
    hint: 'Para flotar: el ícono <svg class="inline-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg> en la barra del reproductor, <kbd>Alt</kbd> <kbd>P</kbd> en la página, <kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>P</kbd> en cualquier sitio o clic derecho → <em>Abrir en la ventana flotante</em>.',
    quick: 'Controles rápidos',
    back10: 'Atrás 10 segundos',
    fwd10: 'Adelante 10 segundos',
    shuffleTip: 'Aleatorio (YT Music, Spotify, listas de YouTube)',
    shuffle: 'Aleatorio',
    repeatTip: 'Alterna los modos de repetición del sitio',
    repeat: 'Repetir',
    size: 'Tamaño de la ventana de video',
    autoTip: 'Último tamaño usado',
    medium: 'Mediano',
    large: 'Grande',
    autoAdvance: 'Pasar solo cuando el video termina',
    extraTitle: 'Más sitios',
    extraText: 'Ícono en la barra del reproductor y <kbd>Alt</kbd> <kbd>P</kbd> también en sitios de streaming y de música, TikTok e Instagram.',
    rateQ: '¿Te gusta FloatMini?',
    rateLink: 'Califícalo ★',
    rateClose: 'No mostrar de nuevo',
    openSource: 'Código abierto',
    report: 'Reportar un problema',
    supportTip: 'Apoya FloatMini en Buy Me a Coffee',
    support: 'Apoya el proyecto',
    enable: 'Activar',
    enabled: 'Activo ✓',
    enableTip: 'El navegador pedirá permiso solo para estos sitios',
    disableTip: 'Haz clic para desactivar en estos sitios',
    readyReload: '¡Listo! Recarga la pestaña del sitio para ver el ícono.',
    permError: 'No se pudo cambiar el permiso.'
  }
};
const PT_TEXT = {
  enable: 'Ativar',
  enabled: 'Ativo ✓',
  enableTip: 'O navegador vai pedir permissão só para esses sites',
  disableTip: 'Clique para desativar nesses sites',
  readyReload: 'Pronto! Recarregue a aba do site para o ícone aparecer.',
  permError: 'Não foi possível mudar a permissão.'
};
const LANG = (() => {
  try {
    return (chrome.i18n?.getUILanguage?.() || 'pt').slice(0, 2).toLowerCase();
  } catch {
    return 'pt';
  }
})();
// Português fica como está; idioma sem tradução usa o inglês.
const TEXT_LANG = LANG === 'pt' ? 'pt' : POPUP_I18N[LANG] ? LANG : 'en';
const T = (key) => POPUP_I18N[TEXT_LANG]?.[key] ?? PT_TEXT[key] ?? key;
if (POPUP_I18N[TEXT_LANG]) {
  document.documentElement.lang = TEXT_LANG;
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = T(node.dataset.i18n);
  // Textos fixos da própria extensão (com <kbd>/<svg>), nunca vindos de fora.
  for (const node of document.querySelectorAll('[data-i18n-html]')) {
    const parsed = new DOMParser().parseFromString(`<body>${T(node.dataset.i18nHtml)}</body>`, 'text/html');
    node.replaceChildren(...parsed.body.childNodes);
  }
  for (const node of document.querySelectorAll('[data-i18n-title]')) node.title = T(node.dataset.i18nTitle);
}

const STATUS_TEXT = {
  pt: {
    needs_click: 'Clique no botão azul que apareceu na página para abrir a janela.',
    no_media: 'Nenhum vídeo encontrado nesta aba.',
    failed: 'O navegador não permitiu abrir a janela flutuante nesta página.',
    not_found: 'Esse controle não existe nesta página.',
    blocked: 'Esta página não aceita extensões (ex.: chrome:// ou a loja do Chrome). Abra um site com vídeo.'
  },
  en: {
    needs_click: 'Click the blue button on the page to open the window.',
    no_media: 'No video found in this tab.',
    failed: 'The browser did not allow the floating window on this page.',
    not_found: "This control doesn't exist on this page.",
    blocked: 'This page does not accept extensions (e.g. chrome:// or the Chrome Web Store). Open a site with video.'
  },
  es: {
    needs_click: 'Haz clic en el botón azul de la página para abrir la ventana.',
    no_media: 'No se encontró ningún video en esta pestaña.',
    failed: 'El navegador no permitió abrir la ventana flotante en esta página.',
    not_found: 'Este control no existe en esta página.',
    blocked: 'Esta página no acepta extensiones (p. ej. chrome:// o la tienda de Chrome). Abre un sitio con video.'
  }
}[TEXT_LANG];

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
    showStatus(STATUS_TEXT.blocked, 'error');
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
  extraPerm.textContent = granted ? T('enabled') : T('enable');
  extraPerm.title = granted ? T('disableTip') : T('enableTip');
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
    if (extraPerm.dataset.on === 'true') showStatus(T('readyReload'), 'ok');
  } catch {
    showStatus(T('permError'), 'error');
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
