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

  // Controles de volume do site. O layout do YouTube Music muda com frequência,
  // então além dos seletores conhecidos vale qualquer elemento com "volume" no
  // id, classe ou rótulo, e qualquer controle deslizante.
  const SITE_VOLUME =
    '.ytp-volume-area, .ytp-volume-panel, .ytp-mute-button, #volume-slider, #expand-volume-slider, #expand-volume, ytmusic-player-expanding-menu, tp-yt-paper-slider, input[type="range"], [role="slider"]';
  const VOLUME_WORD = /volume|mute|mudo|som\b/i;
  let desired = null; // { percent, muted }
  let applying = false; // eventos disparados pela própria extensão

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
    applying = true;
    try {
      applyNow();
    } finally {
      applying = false;
    }
  }

  function applyNow() {
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
    const p = player();
    if (!p) return;
    const percent = p.getVolume?.();
    const muted = p.isMuted?.();
    if ((typeof percent === 'number' && !desired.muted && percent !== desired.percent) || (typeof muted === 'boolean' && muted !== desired.muted)) {
      apply();
    }
  }

  // A pessoa mexeu no volume do próprio site: o site passa a valer e a
  // extensão para de corrigir (até ela mudar o volume na janela flutuante).
  const isVolumeControl = (n) => {
    if (!(n instanceof Element)) return false;
    if (n.matches(SITE_VOLUME)) return true;
    const label = `${n.id} ${typeof n.className === 'string' ? n.className : ''} ${n.getAttribute('aria-label') || ''} ${n.getAttribute('title') || ''}`;
    return VOLUME_WORD.test(label);
  };
  const releaseOnSiteInput = (event) => {
    if (applying || !desired) return;
    if (event.composedPath().some(isVolumeControl)) desired = null;
  };
  for (const type of ['pointerdown', 'wheel', 'input', 'change']) {
    document.addEventListener(type, releaseOnSiteInput, true);
  }
  document.addEventListener(
    'keydown',
    (e) => {
      if (!e.isTrusted) return;
      const t = e.target;
      if (t instanceof Element && t.closest('input, textarea, [contenteditable="true"]')) return;
      if (['ArrowUp', 'ArrowDown'].includes(e.key) || e.key === 'm' || e.key === 'M') desired = null;
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
