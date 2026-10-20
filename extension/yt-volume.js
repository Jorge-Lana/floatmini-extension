// FloatMini — ponte de volume (roda no "mundo" da página do YouTube).
//
// O YouTube e o YouTube Music guardam o próprio volume e o reaplicam sozinhos
// (troca de faixa, qualidade, anúncio). Este script recebe o volume escolhido
// na janela flutuante, aplica pela API do player e, se o site mudar o volume
// por conta própria, devolve o valor escolhido. Se a pessoa mexer no volume
// do próprio site (barra, roda do mouse, setas, M), o site passa a valer.
(() => {
  'use strict';
  if (window.__floatminiVolume) return;
  window.__floatminiVolume = true;

  const SITE_VOLUME =
    '.ytp-volume-area, .ytp-volume-panel, .ytp-mute-button, #volume-slider, #expand-volume-slider, #expand-volume, ytmusic-player-expanding-menu';
  const USER_WINDOW_MS = 1500;
  let desired = null; // { percent, muted }
  let lastSiteInput = 0;

  const player = () => {
    const p = document.getElementById('movie_player');
    return p && typeof p.setVolume === 'function' ? p : null;
  };

  function sliders() {
    const out = [];
    for (const sel of ['#volume-slider', '#expand-volume-slider']) {
      for (const s of document.querySelectorAll(sel)) out.push(s);
    }
    return out;
  }

  function apply() {
    if (!desired) return;
    const p = player();
    if (p) {
      if (!desired.muted && p.getVolume?.() !== desired.percent) p.setVolume(desired.percent);
      if (desired.muted && !p.isMuted?.()) p.mute();
      if (!desired.muted && p.isMuted?.() !== false) p.unMute();
    }
    // YouTube Music: o controle da barra do site também guarda o volume.
    if (!desired.muted) {
      for (const s of sliders()) {
        if (Number(s.value) !== desired.percent) {
          s.value = desired.percent;
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  }

  function siteChanged() {
    if (!desired) return;
    // Mudança feita pela pessoa no próprio site: aceita e para de corrigir.
    if (Date.now() - lastSiteInput < USER_WINDOW_MS) {
      desired = null;
      return;
    }
    const p = player();
    if (!p) return;
    const percent = p.getVolume?.();
    const muted = p.isMuted?.();
    if ((typeof percent === 'number' && !desired.muted && percent !== desired.percent) || (typeof muted === 'boolean' && muted !== desired.muted)) {
      apply();
    }
  }

  // Interação da pessoa com o volume do site (inclui Shadow DOM).
  const markSiteInput = (event) => {
    const hit = event.composedPath().some((n) => n instanceof Element && n.matches(SITE_VOLUME));
    if (hit) lastSiteInput = Date.now();
  };
  for (const type of ['pointerdown', 'wheel', 'input', 'change']) {
    document.addEventListener(type, (e) => e.isTrusted && markSiteInput(e), true);
  }
  document.addEventListener(
    'keydown',
    (e) => {
      if (!e.isTrusted) return;
      const t = e.target;
      if (t instanceof Element && t.closest('input, textarea, [contenteditable="true"]')) return;
      if (['ArrowUp', 'ArrowDown'].includes(e.key) || e.key === 'm' || e.key === 'M') lastSiteInput = Date.now();
    },
    true
  );

  // O site trocou o volume: confere na hora e também de tempos em tempos
  // (no YouTube o <video> pode estar na janela flutuante, fora desta página).
  document.addEventListener('volumechange', siteChanged, true);
  setInterval(siteChanged, 700);

  document.addEventListener('floatmini:volume', (event) => {
    let req;
    try {
      req = JSON.parse(event.detail);
    } catch {
      return;
    }
    desired = {
      percent: Math.round(Math.min(1, Math.max(0, Number(req.volume) || 0)) * 100),
      muted: Boolean(req.muted)
    };
    apply();
  });
})();
