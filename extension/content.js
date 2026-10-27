// FloatMini - content script
//
// Carregado automaticamente no YouTube, YouTube Music e Spotify Web.
// Em outros sites é injetado sob demanda (popup, menu de contexto, atalho).

(() => {
  if (window.__floatMiniLoaded) return;
  window.__floatMiniLoaded = true;

  const host = location.hostname;
  const SITE =
    host === 'music.youtube.com' ? 'youtube-music'
    : host === 'youtube.com' || host.endsWith('.youtube.com') ? 'youtube'
    : host === 'open.spotify.com' ? 'spotify'
    : host === 'netflix.com' || host.endsWith('.netflix.com') ? 'netflix'
    : 'other';
  const IS_MUSIC_SITE = SITE === 'youtube-music' || SITE === 'spotify';

  const VIDEO_AUTO_SIZE = { width: 480, height: 270 };
  const MUSIC_WIDGET_SIZE = { width: 360, height: 172 };
  const SPEEDS = [1, 1.25, 1.5, 2];

  // ---------------------------------------------------------------------------
  // Preferências (popup)
  // ---------------------------------------------------------------------------
  const settings = { pipSize: 'auto' };

  chrome.storage.local.get(['pipSize'], (res) => {
    if (res?.pipSize) settings.pipSize = res.pipSize;
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.pipSize) settings.pipSize = changes.pipSize.newValue || 'auto';
  });

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  const $ = (selector, root = document) => root.querySelector(selector);

  // Busca que também entra em Shadow DOM (abertos e fechados). O YouTube
  // Music passou a usar componentes com shadow root, onde querySelector comum
  // não enxerga a barra do player.
  function shadowRootOf(el) {
    if (el.shadowRoot) return el.shadowRoot;
    try {
      // Chrome: chrome.dom; Firefox: propriedade disponível só para extensões.
      return chrome.dom?.openOrClosedShadowRoot?.(el) || el.openOrClosedShadowRoot || null;
    } catch {
      return null;
    }
  }

  let rootsCache = { at: 0, base: null, roots: [] };
  function allRoots(base = document) {
    const now = Date.now();
    if (rootsCache.base === base && now - rootsCache.at < 1500) return rootsCache.roots;
    const roots = [];
    const visit = (root) => {
      roots.push(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      for (let node = walker.currentNode; node; node = walker.nextNode()) {
        if (node.nodeType !== 1) continue;
        const sr = shadowRootOf(node);
        if (sr) visit(sr);
      }
    };
    visit(base);
    rootsCache = { at: now, base, roots };
    return roots;
  }

  function deepAll(selector, base = document) {
    const out = [];
    for (const root of allRoots(base)) out.push(...root.querySelectorAll(selector));
    if (base !== document && base.matches?.(selector)) out.unshift(base);
    return out;
  }
  const deep$ = (selector, base = document) => deepAll(selector, base)[0] || null;

  function findYtMusicBar() {
    return (
      deep$('ytmusic-miniplayer') ||
      deep$('ytmusic-player-bar') ||
      deep$('#play-pause-button')?.closest('ytmusic-player-bar, footer, [class*="player-bar"]') ||
      null
    );
  }

  // Componentes do YouTube (yt-icon-button, tp-yt-paper-icon-button...) às
  // vezes só reagem ao clique no <button> interno.
  function clickableOf(el) {
    if (el.tagName.includes('-')) return deep$('button', el) || el;
    return el;
  }

  function clickFirst(selectors, root = document) {
    for (const selector of selectors) {
      const found = deepAll(selector, root);
      const el = found.find(isVisible) || found[0];
      if (el) {
        clickableOf(el).click();
        return true;
      }
    }
    return false;
  }

  // Simula um atalho de teclado do próprio site (plano B quando o botão
  // muda de nome/lugar numa atualização do layout).
  function pressSiteShortcut(key) {
    const target = document.body;
    if (!target) return false;
    const init = { key, code: `Key${key.toUpperCase()}`, bubbles: true, cancelable: true, composed: true };
    target.dispatchEvent(new KeyboardEvent('keydown', init));
    target.dispatchEvent(new KeyboardEvent('keyup', init));
    return true;
  }

  // Metadados que o próprio site publica para o sistema operacional
  // (Media Session). Mais estável que ler o HTML do player.
  function mediaSessionInfo() {
    const meta = navigator.mediaSession?.metadata;
    if (!meta) return null;
    const artwork = [...(meta.artwork || [])].sort(
      (a, b) => parseInt(b.sizes || '0', 10) - parseInt(a.sizes || '0', 10)
    )[0];
    return { title: meta.title, artist: meta.artist, cover: artwork?.src };
  }

  // Estado de um botão liga/desliga lido do próprio site.
  function pressedOf(el) {
    if (!el) return null;
    const node = el.matches('[aria-pressed],[aria-checked]') ? el : deep$('[aria-pressed],[aria-checked]', el);
    const value = node?.getAttribute('aria-pressed') ?? node?.getAttribute('aria-checked');
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'mixed') return 'mixed';
    return null;
  }

  // "Repetir tudo" / "Repeat one" / "Repetição desativada"... -> modo.
  function repeatFromLabel(text) {
    if (!text) return null;
    if (/\b(one|uma|única|unica|esta|this)\b/i.test(text)) return 'one';
    if (/(desativad|off\b|none|sem repet|não repet)/i.test(text)) return 'off';
    if (/\b(all|tudo|todas)\b/i.test(text)) return 'all';
    return null;
  }

  function findButton(selectors) {
    for (const selector of selectors) {
      const found = deepAll(selector);
      const el = found.find(isVisible) || found[0];
      if (el) return el;
    }
    return null;
  }

  function ytMusicState() {
    const bar = findYtMusicBar();
    const attr = (name) => bar?.getAttribute(name) ?? bar?.getAttribute(`${name}_`);
    let repeat = { NONE: 'off', ALL: 'all', ONE: 'one' }[(attr('repeat-mode') || '').toUpperCase()] || null;
    const repeatBtn = findButton(['.ytmusicPlayerControlsRepeatButton button', 'ytmusic-player-bar .repeat', '#right-controls .repeat', 'yt-icon-button.repeat']);
    if (!repeat && repeatBtn) {
      const inner = clickableOf(repeatBtn);
      repeat =
        repeatFromLabel(repeatBtn.getAttribute('title')) ||
        repeatFromLabel(inner.getAttribute('title')) ||
        repeatFromLabel(inner.getAttribute('aria-label') || repeatBtn.getAttribute('aria-label'));
    }
    let shuffle = null;
    const shuffleAttr = attr('shuffle-on');
    if (shuffleAttr !== null && shuffleAttr !== undefined) shuffle = shuffleAttr !== 'false';
    if (shuffle === null) {
      const shuffleBtn = findButton(['.ytmusicPlayerControlsShuffleButton button', 'ytmusic-player-bar .shuffle', '#right-controls .shuffle', 'yt-icon-button.shuffle']);
      const p = pressedOf(shuffleBtn);
      if (p !== null) shuffle = p === true;
      // Layout novo: o wrapper ganha uma classe de "ativo" quando ligado.
      else if (shuffleBtn) {
        const classes = `${shuffleBtn.className} ${shuffleBtn.parentElement?.className || ''}`;
        if (/(Active|Selected|Toggled|Enabled)\b/.test(classes)) shuffle = true;
      }
    }
    return { shuffle, repeat };
  }

  function spotifyState() {
    const shuffleP = pressedOf($('[data-testid="control-button-shuffle"]'));
    const repeatP = pressedOf($('[data-testid="control-button-repeat"]'));
    // Spotify: aria-checked="mixed" = repetir só esta música.
    const repeat = repeatP === 'mixed' ? 'one' : repeatP === true ? 'all' : repeatP === false ? 'off' : null;
    return { shuffle: shuffleP === null ? null : shuffleP === true, repeat };
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    return el.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  function seekTo(video, time) {
    const max = Number.isFinite(video.duration) ? video.duration : Infinity;
    const target = Math.min(max, Math.max(0, time));
    if (SITE === 'netflix') {
      // A Netflix trava se o <video> for alterado direto: usa a API do player.
      const detail = JSON.stringify({ time: target });
      document.dispatchEvent(new CustomEvent('floatmini:seek', { detail }));
      return;
    }
    video.currentTime = target;
  }

  function seekBy(video, seconds) {
    seekTo(video, video.currentTime + seconds);
  }

  function formatClock(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
  }

  // Legendas que o site desenha na página (não no <video>). Ao levar o vídeo
  // para a janela flutuante, o texto é copiado para lá.
  const CAPTION_SELECTORS = [
    '.ytp-caption-window-container .caption-visual-line', // YouTube
    '.player-timedtext-text-container', // Netflix
    '.atvwebplayersdk-captions-text', // Prime Video
    '.hive-subtitle-renderer-line', // Disney+
    '.dss-subtitle-renderer-line',
    '.dss-subtitle-renderer-cue'
  ];

  const nodeText = (node) => (node.innerText ?? node.textContent ?? '').trim();

  // Players que usam faixas de legenda "escondidas" (mode = hidden) e
  // desenham o texto eles mesmos: lê as falas ativas direto da faixa.
  function readTrackCaptions(video) {
    const tracks = [...(video?.textTracks || [])];
    // Faixa "showing" o navegador já desenha dentro do próprio vídeo.
    if (tracks.some((t) => t.mode === 'showing')) return '';
    const lines = [];
    for (const track of tracks) {
      if (track.mode !== 'hidden' || !/^(subtitles|captions)$/.test(track.kind)) continue;
      for (const cue of track.activeCues || []) {
        const text = String(cue.text || '').replace(/<[^>]+>/g, '').trim();
        if (text && !lines.includes(text)) lines.push(text);
      }
    }
    return lines.join('\n');
  }

  // Qualquer outro site (Globoplay, Max, Crunchyroll...): procura, perto do
  // player, um elemento de legenda pelo nome da classe/id.
  const CAPTION_HINT =
    '[class*="subtitle" i], [class*="caption" i], [class*="legenda" i], [class*="timedtext" i], [class*="texttrack" i], [id*="subtitle" i], [id*="caption" i], [id*="legenda" i]';

  function readNearbyCaptions(anchor) {
    let root = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
    for (let i = 0; i < 5 && root?.parentElement && root.parentElement !== document.body; i++) root = root.parentElement;
    if (!root) return '';
    const found = [];
    for (const node of root.querySelectorAll(CAPTION_HINT)) {
      if (node.closest('[role="menu"], [role="menuitem"], [role="listbox"], [aria-hidden="true"], button, select')) continue;
      if (node.querySelector('button, input, select, [role="button"]')) continue;
      if (!isVisible(node)) continue;
      const text = nodeText(node);
      if (!text || text.length > 300) continue;
      found.push({ node, text });
    }
    // Fica com os elementos mais externos (o texto dos internos já está neles).
    const lines = [];
    for (const { node, text } of found) {
      if (found.some((f) => f.node !== node && f.node.contains(node))) continue;
      if (!lines.includes(text)) lines.push(text);
    }
    return lines.join('\n');
  }

  function readSiteCaptions(video, anchor) {
    for (const sel of CAPTION_SELECTORS) {
      const lines = [];
      for (const node of document.querySelectorAll(sel)) {
        const text = nodeText(node);
        if (text && !lines.includes(text)) lines.push(text);
      }
      if (lines.length) return lines.join('\n');
    }
    // Em feeds (TikTok, Reels) o texto do post fica perto do vídeo e
    // pareceria legenda: lá só vale a faixa de legenda.
    return readTrackCaptions(video) || (isFeedPage() ? '' : readNearbyCaptions(anchor));
  }

  function cleanTitle(title) {
    return (title || '')
      .replace(/^\(\d+\)\s*/, '') // contador de notificações do YouTube
      .replace(/\s*[-|]\s*YouTube( Music)?$/, '')
      .trim() || 'FloatMini';
  }

  function parseClock(text) {
    if (!text) return NaN;
    return text.trim().split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
  }

  // Feeds de vídeos curtos (um embaixo do outro): YouTube Shorts, TikTok e
  // Reels do Instagram. Neles a janela ganha botões de anterior/próximo.
  function isFeedPage() {
    if (SITE === 'youtube') return location.pathname.startsWith('/shorts');
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return true;
    if (host === 'instagram.com' || host.endsWith('.instagram.com')) return /^\/(reels?)(\/|$)/.test(location.pathname);
    return false;
  }

  // Vídeo do feed que está na tela: tocando e mais visível no viewport.
  function findFeedVideo(exclude = null) {
    const videos = [...document.querySelectorAll('video')].filter((v) => v !== exclude);
    if (!videos.length) return null;
    const visibleArea = (v) => {
      const r = v.getBoundingClientRect();
      const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      return w * h;
    };
    const score = (v) => (v.paused ? 0 : 1e9) + visibleArea(v);
    return videos.sort((a, b) => score(b) - score(a))[0];
  }

  function findMainVideo() {
    if (isFeedPage()) return findFeedVideo();
    if (SITE === 'youtube' || SITE === 'youtube-music') {
      const ytVideo = $('#movie_player video.html5-main-video') || $('video.html5-main-video');
      if (ytVideo) return ytVideo;
    }
    const videos = SITE === 'youtube-music' ? deepAll('video') : [...document.querySelectorAll('video')];
    if (!videos.length) return null;
    // Prefere o vídeo tocando e, depois, o maior na tela.
    const score = (v) => {
      const rect = v.getBoundingClientRect();
      return (v.paused ? 0 : 1e7) + rect.width * rect.height;
    };
    return videos.sort((a, b) => score(b) - score(a))[0];
  }

  // ---------------------------------------------------------------------------
  // Controles por site (aleatório, repetir, anterior, próxima...)
  // ---------------------------------------------------------------------------
  const SITE_CONTROLS = {
    'youtube-music': {
      root: () => findYtMusicBar(),
      title: (root) => root && deep$('.ytmusicTrackInfoTitle, .content-info-wrapper .title, .title', root)?.textContent,
      artist: (root) => root && deep$('.ytmusicTrackInfoByline, .content-info-wrapper .byline, .byline', root)?.textContent,
      cover: (root) => root && deep$('img.ytmusicTrackInfoThumbnail, .thumbnail-image-wrapper img, img.image', root)?.src,
      isPlaying: () => {
        const v = findMainVideo();
        return !!v && !v.paused;
      },
      progress: () => {
        const v = findMainVideo();
        return v ? { current: v.currentTime, total: v.duration } : null;
      },
      seek: (fraction) => {
        const v = findMainVideo();
        if (v && v.duration > 0) v.currentTime = fraction * v.duration;
      },
      buttons: {
        // Layout novo (ytmusic-miniplayer) primeiro, depois o antigo.
        prev: ['.ytmusicPlayerControlsPreviousButton button', '.previous-button', '[aria-label*="anterior" i]', '[aria-label*="previous" i]'],
        play: ['.ytmusicPlayerControlsPlayPauseButton button', '#play-pause-button', '.play-pause-button'],
        next: ['.ytmusicPlayerControlsNextButton button', '.next-button', '[aria-label*="próxima" i]', '[aria-label*="next" i]'],
        shuffle: ['.ytmusicPlayerControlsShuffleButton button', '.shuffle', '[aria-label*="aleat" i]', '[aria-label*="shuffle" i]', '[title*="aleat" i]'],
        repeat: ['.ytmusicPlayerControlsRepeatButton button', '.repeat', '[aria-label*="repet" i]', '[aria-label*="repeat" i]', '[title*="repet" i]']
      },
      // Fora da barra do player, só classes específicas (aria-label solto
      // pegaria o botão "Aleatório" de álbuns/playlists ou setas de carrossel).
      globalButtons: {
        prev: ['.ytmusicPlayerControlsPreviousButton button', 'ytmusic-player-bar .previous-button', '#left-controls .previous-button'],
        play: ['.ytmusicPlayerControlsPlayPauseButton button', 'ytmusic-player-bar #play-pause-button', '#left-controls #play-pause-button'],
        next: ['.ytmusicPlayerControlsNextButton button', 'ytmusic-player-bar .next-button', '#left-controls .next-button'],
        shuffle: ['.ytmusicPlayerControlsShuffleButton button', 'ytmusic-player-bar .shuffle', '#right-controls .shuffle', 'yt-icon-button.shuffle'],
        repeat: ['.ytmusicPlayerControlsRepeatButton button', 'ytmusic-player-bar .repeat', '#right-controls .repeat', 'yt-icon-button.repeat']
      },
      state: ytMusicState,
      // Atalhos de teclado do YouTube Music, usados como último recurso.
      shortcuts: { shuffle: 's', repeat: 'r', next: 'j', prev: 'k' }
    },
    spotify: {
      root: () => $('[data-testid="now-playing-bar"]') || $('footer') || document,
      title: () =>
        $('[data-testid="now-playing-widget"] [data-testid="context-item-link"]')?.textContent,
      artist: () =>
        $('[data-testid="now-playing-widget"] [data-testid="context-item-info-artist"]')?.textContent,
      cover: () =>
        ($('[data-testid="now-playing-widget"] [data-testid="cover-art-image"]') ||
          $('[data-testid="now-playing-widget"] img'))?.src,
      isPlaying: () => {
        const label = $('[data-testid="control-button-playpause"]')?.getAttribute('aria-label') || '';
        return /paus/i.test(label); // "Pausar" / "Pause" = está tocando
      },
      progress: () => ({
        current: parseClock($('[data-testid="playback-position"]')?.textContent),
        total: parseClock($('[data-testid="playback-duration"]')?.textContent)
      }),
      // A barra de progresso do Spotify é um <input type=range> controlado pelo React.
      seek: (fraction) => {
        const input = $('[data-testid="playback-progressbar"] input[type="range"]');
        if (!input) return;
        const min = Number(input.min || 0);
        const max = Number(input.max || 1);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, String(Math.round(min + fraction * (max - min))));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      },
      buttons: {
        prev: ['[data-testid="control-button-skip-back"]'],
        play: ['[data-testid="control-button-playpause"]'],
        next: ['[data-testid="control-button-skip-forward"]'],
        shuffle: ['[data-testid="control-button-shuffle"]'],
        repeat: ['[data-testid="control-button-repeat"]']
      },
      state: spotifyState
    },
    youtube: {
      // No YouTube "normal", aleatório/repetir existem só no painel de playlist.
      root: () => $('ytd-playlist-panel-renderer'),
      buttons: {
        shuffle: ['[aria-label*="aleat" i]', '[aria-label*="shuffle" i]'],
        repeat: ['ytd-playlist-loop-button-renderer button', '[aria-label*="repet" i]', '[aria-label*="loop" i]']
      }
    }
  };

  function siteAction(name) {
    const cfg = SITE_CONTROLS[SITE];
    if (!cfg) return false;
    const root = cfg.root();
    const selectors = cfg.buttons?.[name];
    if (root && selectors && clickFirst(selectors, root)) return true;
    const global = cfg.globalButtons?.[name];
    if (global && clickFirst(global)) return true;
    const key = cfg.shortcuts?.[name];
    if (key) return pressSiteShortcut(key);
    return false;
  }

  // ---------------------------------------------------------------------------
  // Janela flutuante (Document Picture-in-Picture)
  // ---------------------------------------------------------------------------
  const PIP_CSS = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a; color: #f8fafc; overflow: hidden; user-select: none;
    }
    button { font: inherit; }
    .fm-btn {
      background: rgba(30, 41, 59, 0.92); color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 6px;
      padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap;
    }
    .fm-btn:hover { background: #334155; color: #fff; }
    .fm-btn.fm-primary { background: #2563eb; border-color: #3b82f6; color: #fff; }

    /* Vídeo */
    body.fm-video { background: #000; }
    .fm-stage { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    .fm-stage video {
      width: 100% !important; height: 100% !important; object-fit: contain;
      position: static !important; left: auto !important; top: auto !important; transform: none !important;
    }
    /* Só o vídeo; os controles aparecem numa barrinha quando o mouse mexe. */
    .fm-overlay-bottom {
      position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%);
      display: flex; align-items: center; justify-content: center; flex-wrap: nowrap; gap: 4px;
      max-width: calc(100% - 16px); padding: 5px 6px; border-radius: 10px;
      background: rgba(15, 23, 42, 0.78); backdrop-filter: blur(8px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      opacity: 0; pointer-events: none; transition: opacity 0.25s ease;
    }
    body.fm-active .fm-overlay-bottom { opacity: 1; pointer-events: auto; }
    .fm-overlay-bottom .fm-btn { flex-shrink: 0; }
    /* Linha do tempo: clique ou arraste para ir a qualquer ponto. */
    .fm-timeline {
      position: absolute; left: 10px; right: 10px; bottom: 52px;
      display: flex; align-items: center; gap: 8px;
      font-size: 11px; font-variant-numeric: tabular-nums; color: #e2e8f0;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
      opacity: 0; pointer-events: none; transition: opacity 0.25s ease;
    }
    body.fm-active .fm-timeline { opacity: 1; pointer-events: auto; }
    .fm-timeline[hidden] { display: none; }
    .fm-timeline input[type='range'] {
      flex: 1; min-width: 0; height: 4px; cursor: pointer;
      -webkit-appearance: none; appearance: none; border-radius: 4px;
      background: linear-gradient(to right, #3b82f6 var(--fm-pct, 0%), rgba(255, 255, 255, 0.3) var(--fm-pct, 0%));
    }
    .fm-timeline input[type='range']::-webkit-slider-thumb {
      -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 0;
    }
    .fm-timeline input[type='range']::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 0; }
    /* Legendas copiadas do site. */
    .fm-captions {
      position: absolute; left: 50%; bottom: 7%; transform: translateX(-50%);
      width: max-content; max-width: 92%; padding: 2px 8px; border-radius: 4px; text-align: center;
      white-space: pre-line; line-height: 1.3; pointer-events: none;
      font-size: clamp(12px, 4.4vw, 30px); color: #fff; background: rgba(0, 0, 0, 0.6);
      transition: bottom 0.25s ease;
    }
    .fm-captions:empty { display: none; }
    body.fm-active .fm-captions { bottom: 84px; }
    .fm-overlay-bottom .fm-volume input[type='range'] { width: 64px; }
    .fm-lbl { margin-left: 3px; }
    /* Janela estreita: só ícones e volume menor, tudo numa linha. */
    @media (max-width: 520px) {
      .fm-lbl { display: none; }
      .fm-overlay-bottom { gap: 3px; padding: 4px 5px; }
      .fm-overlay-bottom .fm-btn { padding: 4px 7px; }
      .fm-overlay-bottom .fm-volume input[type='range'] { width: 48px; }
    }
    @media (max-width: 300px) {
      .fm-overlay-bottom .fm-volume input[type='range'] { display: none; }
    }
    body.fm-video:not(.fm-active) { cursor: none; }

    /* Música (YouTube Music / Spotify) */
    body.fm-music { display: flex; flex-direction: column; padding: 10px; gap: 8px; }
    .fm-music-main { display: flex; gap: 10px; align-items: center; min-height: 0; flex: 1; }
    .fm-cover {
      width: 64px; height: 64px; border-radius: 8px; object-fit: cover; flex-shrink: 0;
      background: #1e293b; border: 1px solid rgba(255,255,255,0.08);
    }
    .fm-meta { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .fm-track { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fm-artist { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fm-progress { height: 3px; background: #334155; border-radius: 3px; overflow: hidden; margin-top: 4px; }
    .fm-seek { padding: 5px 0; margin: -1px 0 -5px; cursor: pointer; touch-action: none; }
    .fm-seek:hover .fm-progress { height: 5px; }
    .fm-bar { height: 100%; width: 0%; background: #3b82f6; }
    .fm-volume { display: flex; align-items: center; gap: 6px; }
    .fm-volume .fm-btn { padding: 3px 5px; display: flex; align-items: center; }
    .fm-volume svg { width: 15px; height: 15px; fill: currentColor; display: block; }
    .fm-volume input[type='range'] {
      -webkit-appearance: none; appearance: none; width: 80px; height: 4px; border-radius: 4px;
      background: linear-gradient(to right, #3b82f6 var(--fm-fill, 100%), #334155 var(--fm-fill, 100%));
      cursor: pointer; outline: none;
    }
    .fm-volume input[type='range']::-webkit-slider-thumb {
      -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 0;
    }
    .fm-music .fm-volume { margin-top: 6px; }
    .fm-music .fm-volume input[type='range'] { flex: 1; width: auto; }
    .fm-music-controls { display: flex; justify-content: space-between; gap: 4px; }
    .fm-music-controls .fm-btn { flex: 1; font-size: 12px; padding: 5px 0; display: flex; align-items: center; justify-content: center; }
    .fm-music-controls .fm-btn svg { width: 16px; height: 16px; fill: currentColor; display: block; }
    .fm-btn.fm-toggle { color: #64748b; }
    .fm-btn.fm-toggle.fm-on { background: rgba(59, 130, 246, 0.28); border-color: #3b82f6; color: #93c5fd; }
  `;

  function el(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeButton(doc, label, title, onClick) {
    const btn = el(doc, 'button', 'fm-btn', label);
    btn.type = 'button';
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function preparePipDocument(pipWindow, bodyClass) {
    const doc = pipWindow.document;
    const style = doc.createElement('style');
    style.textContent = PIP_CSS;
    doc.head.append(style);
    doc.title = 'FloatMini';
    doc.body.className = bodyClass;
    return doc;
  }

  function getVideoPipSize() {
    const size = settings.pipSize;
    if (size && typeof size === 'object' && size.width > 0 && size.height > 0) return size;
    // Shorts, TikTok e Reels são verticais: janela em pé.
    if (isFeedPage()) return { width: 300, height: 533 };
    return VIDEO_AUTO_SIZE;
  }

  function feedButton(dir) {
    const down = dir > 0;
    const selectors =
      SITE === 'youtube'
        ? [`#navigation-button-${down ? 'down' : 'up'} button`, `#navigation-button-${down ? 'down' : 'up'} [role="button"]`]
        : [`button[data-e2e="arrow-${down ? 'down' : 'up'}"]`, `[data-e2e="arrow-${down ? 'down' : 'up'}"] button`];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn && isVisible(btn)) return btn;
    }
    // Rótulos acessíveis ("Próximo vídeo", "Next video", "Anterior"...).
    const label = down ? /(pr[óo]xim|next|seguinte)/i : /(anterior|previous|prev\b)/i;
    return [...document.querySelectorAll('button, [role="button"]')].find(
      (b) => isVisible(b) && label.test(b.getAttribute('aria-label') || '') && /(v[íi]deo|video|reel|short)/i.test(b.getAttribute('aria-label') || '')
    );
  }

  function scrollParent(node) {
    for (let el = node?.parentElement; el; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 10) return el;
    }
    return null;
  }

  // Vai para o vídeo anterior/próximo do feed: usa o botão do site ou rola
  // a lista uma tela para cima/baixo, como a pessoa faria.
  function moveFeed(dir, near) {
    const btn = feedButton(dir);
    if (btn) {
      btn.click();
      return;
    }
    const box = scrollParent(near);
    if (box) box.scrollBy({ top: dir * box.clientHeight, behavior: 'smooth' });
    else window.scrollBy({ top: dir * innerHeight, behavior: 'smooth' });
  }

  function waitFor(check, timeoutMs, stepMs = 120) {
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        const found = check(Date.now() - started);
        if (found || Date.now() - started >= timeoutMs) resolve(found || null);
        else setTimeout(tick, stepMs);
      };
      tick();
    });
  }

  function buildVideoWindow(pipWindow, video) {
    const doc = preparePipDocument(pipWindow, 'fm-video');
    const wasPlaying = !video.paused;

    // Guarda o lugar exato do vídeo para devolvê-lo ao fechar a janela
    // (ou ao trocar de vídeo no feed).
    const stage = el(doc, 'div', 'fm-stage');
    let placeholder = null;
    let originalParent = null;
    const park = (v) => {
      placeholder = document.createComment('floatmini-video');
      originalParent = v.parentNode;
      originalParent.insertBefore(placeholder, v);
      stage.append(v);
    };
    const unpark = (v) => {
      if (placeholder?.isConnected) placeholder.replaceWith(v);
      else if (originalParent?.isConnected) originalParent.append(v);
      placeholder = null;
    };
    park(video);

    const bottom = el(doc, 'div', 'fm-overlay-bottom');
    const playBtn = makeButton(doc, '', 'Play/Pausar (espaço)', () => (video.paused ? video.play() : video.pause()));
    playBtn.classList.add('fm-primary');
    const speedBtn = makeButton(doc, '', 'Velocidade', () => {
      const index = SPEEDS.indexOf(video.playbackRate);
      video.playbackRate = SPEEDS[(index + 1) % SPEEDS.length];
    });
    const volume = buildVolumeControl(doc, () => volumeTarget(video));
    const back = makeButton(doc, '⏪', 'Voltar 10 segundos (←)', () => seekBy(video, -10));
    back.append(el(doc, 'span', 'fm-lbl', '10s'));
    const fwd = makeButton(doc, '', 'Avançar 10 segundos (→)', () => seekBy(video, 10));
    fwd.append(el(doc, 'span', 'fm-lbl', '10s'), doc.createTextNode(' ⏩'));
    const playIcon = el(doc, 'span', 'fm-ico');
    const playLabel = el(doc, 'span', 'fm-lbl');
    playBtn.append(playIcon, playLabel);
    bottom.append(
      back,
      playBtn,
      fwd,
      speedBtn,
      volume.node
    );

    // Linha do tempo (some em transmissões ao vivo, sem duração).
    const timeline = el(doc, 'div', 'fm-timeline');
    const timeNow = el(doc, 'span', 'fm-time', '0:00');
    const timeTotal = el(doc, 'span', 'fm-time', '0:00');
    const scrub = el(doc, 'input');
    scrub.type = 'range';
    scrub.min = '0';
    scrub.max = '1000';
    scrub.step = '1';
    scrub.value = '0';
    scrub.title = 'Clique ou arraste para mudar o tempo';
    scrub.setAttribute('aria-label', 'Tempo do vídeo');
    timeline.append(timeNow, scrub, timeTotal);
    let scrubbing = false;
    const renderTime = (current) => {
      const total = video.duration;
      const live = !Number.isFinite(total) || total <= 0;
      timeline.hidden = live;
      if (live) return;
      const pct = Math.min(100, Math.max(0, (current / total) * 100));
      timeNow.textContent = formatClock(current);
      timeTotal.textContent = formatClock(total);
      scrub.style.setProperty('--fm-pct', `${pct}%`);
      if (!scrubbing) scrub.value = String(Math.round(pct * 10));
    };
    scrub.addEventListener('input', () => {
      scrubbing = true;
      const target = (Number(scrub.value) / 1000) * video.duration;
      renderTime(target);
      seekTo(video, target);
    });
    scrub.addEventListener('change', () => {
      scrubbing = false;
      renderTime(video.currentTime);
    });
    const onTime = () => renderTime(video.currentTime);

    const captions = el(doc, 'div', 'fm-captions');
    const captionTimer = setInterval(() => {
      const text = readSiteCaptions(video, placeholder || originalParent);
      if (captions.textContent !== text) captions.textContent = text;
    }, 200);

    doc.body.append(stage, captions, timeline, bottom);

    // Controles visíveis enquanto o mouse mexe (ou com o vídeo pausado).
    let idleTimer = null;
    const IDLE_MS = 2000;
    const showControls = () => {
      doc.body.classList.add('fm-active');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        const busy = bottom.matches(':hover') || timeline.matches(':hover') || scrubbing;
        if (!video.paused && !busy && !bottom.contains(doc.activeElement)) {
          doc.body.classList.remove('fm-active');
        }
      }, IDLE_MS);
    };
    ['mousemove', 'pointerdown', 'keydown'].forEach((type) => doc.addEventListener(type, showControls));
    doc.addEventListener('mouseleave', () => {
      if (!video.paused) doc.body.classList.remove('fm-active');
    });
    showControls();

    const refresh = () => {
      doc.title = cleanTitle(document.title);
      if (video.paused) doc.body.classList.add('fm-active');
      playIcon.textContent = video.paused ? '▶' : '⏸';
      playLabel.textContent = video.paused ? 'Play' : 'Pausar';
      speedBtn.textContent = `${video.playbackRate}x`;
      volume.refresh();
      onTime();
    };
    const mediaEvents = ['play', 'pause', 'ratechange', 'volumechange', 'durationchange'];
    const bind = (v) => {
      mediaEvents.forEach((type) => v.addEventListener(type, refresh));
      v.addEventListener('timeupdate', onTime);
    };
    const unbind = (v) => {
      mediaEvents.forEach((type) => v.removeEventListener(type, refresh));
      v.removeEventListener('timeupdate', onTime);
    };
    refresh();
    bind(video);
    const timer = setInterval(refresh, 1000);

    // Feed (Shorts, TikTok, Reels): devolve o vídeo atual para a página, vai
    // para o anterior/próximo e traz o novo vídeo para a janela.
    let switching = false;
    async function switchFeed(dir) {
      if (switching) return;
      switching = true;
      const old = video;
      const oldSrc = old.currentSrc;
      const { muted, volume: level } = old;
      unbind(old);
      unpark(old);
      moveFeed(dir, old);
      const next = await waitFor((elapsed) => {
        const v = findFeedVideo();
        const changed = v && (v !== old || (v.currentSrc && v.currentSrc !== oldSrc));
        // Normalmente o site já dá play no novo vídeo; se não der, aceita o
        // novo vídeo da tela depois de um tempinho e a janela dá o play.
        return changed && (!v.paused || elapsed > 1500) ? v : null;
      }, 4000);
      const target = next || old;
      if (target !== old && !old.paused) old.pause();
      video = target;
      park(target);
      bind(target);
      target.volume = level;
      target.muted = muted;
      if (target.paused) {
        target.play().catch(() => {
          // Sem som o navegador sempre deixa tocar.
          target.muted = true;
          target.play().catch(() => {});
        });
      }
      refresh();
      switching = false;
    }

    doc.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        video.paused ? video.play() : video.pause();
      } else if (e.code === 'ArrowLeft') {
        seekBy(video, -5);
      } else if (e.code === 'ArrowRight') {
        seekBy(video, 5);
      } else if ((e.code === 'ArrowDown' || e.code === 'PageDown') && isFeedPage()) {
        // No feed as setas passam de vídeo, como no próprio site.
        e.preventDefault();
        switchFeed(1);
      } else if ((e.code === 'ArrowUp' || e.code === 'PageUp') && isFeedPage()) {
        e.preventDefault();
        switchFeed(-1);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        volume.step(0.05);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        volume.step(-0.05);
      } else if (e.code === 'KeyM') {
        volume.toggleMute();
      }
    });

    // No feed (Shorts, TikTok, Reels) passa de vídeo rolando ou arrastando
    // na janela, como no celular. Fora dos controles.
    const onControls = (target) => target instanceof pipWindow.Element && !!target.closest('.fm-overlay-bottom, .fm-timeline');
    let wheelSum = 0;
    let wheelLock = 0;
    doc.addEventListener(
      'wheel',
      (e) => {
        if (!isFeedPage() || onControls(e.target)) return;
        e.preventDefault();
        if (Date.now() < wheelLock) return;
        wheelSum += e.deltaY;
        if (Math.abs(wheelSum) >= 60) {
          const dir = wheelSum > 0 ? 1 : -1;
          wheelSum = 0;
          wheelLock = Date.now() + 800; // um vídeo por gesto
          switchFeed(dir);
        }
      },
      { passive: false }
    );
    let swipe = null;
    doc.addEventListener('pointerdown', (e) => {
      swipe = isFeedPage() && !onControls(e.target) ? { x: e.clientX, y: e.clientY } : null;
    });
    doc.addEventListener('pointerup', (e) => {
      if (!swipe) return;
      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dy) >= 80 && Math.abs(dy) > Math.abs(dx) * 1.5) switchFeed(dy < 0 ? 1 : -1);
    });

    if (wasPlaying && video.paused) video.play().catch(() => {});

    pipWindow.addEventListener('pagehide', () => {
      clearInterval(timer);
      clearInterval(captionTimer);
      clearTimeout(idleTimer);
      releaseSiteVolume();
      unbind(video);
      const playing = !video.paused;
      unpark(video);
      if (playing && video.paused) video.play().catch(() => {});
    });
  }

  const ICON_PATHS = {
    shuffle:
      'M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
    repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
    repeatOne: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z',
    volumeUp:
      'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
    volumeDown: 'M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z',
    volumeOff:
      'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z'
  };

  // No YouTube/YT Music o player reaplica o volume dele. Avisa o yt-volume.js
  // (mundo da página), que usa a API do player para o valor ficar.
  // Ao fechar a janela flutuante, o volume volta a ser só do site.
  function releaseSiteVolume() {
    if (SITE !== 'youtube' && SITE !== 'youtube-music') return;
    document.dispatchEvent(new CustomEvent('floatmini:volume', { detail: JSON.stringify({ release: true }) }));
  }

  function syncSiteVolume(media) {
    if (SITE !== 'youtube' && SITE !== 'youtube-music') return;
    const detail = JSON.stringify({ volume: media.volume, muted: media.muted });
    document.dispatchEvent(new CustomEvent('floatmini:volume', { detail }));
  }

  // Volume: no YouTube/YT Music mexe direto no elemento de mídia; no Spotify
  // (sem elemento acessível) usa o controle de volume do próprio site.
  function volumeTarget(video) {
    const media = video || (SITE === 'spotify' ? null : findMainVideo());
    if (media) {
      return {
        get: () => ({ volume: media.volume, muted: media.muted || media.volume === 0 }),
        set: (v) => {
          media.volume = Math.min(1, Math.max(0, v));
          media.muted = v <= 0;
          syncSiteVolume(media);
        },
        toggleMute: () => {
          if (media.muted || media.volume === 0) {
            media.muted = false;
            if (media.volume === 0) media.volume = 0.5;
          } else {
            media.muted = true;
          }
          syncSiteVolume(media);
        }
      };
    }
    if (SITE === 'spotify') {
      const slider = () => $('[data-testid="volume-bar"] input[type="range"]');
      const muteBtn = () => $('[data-testid="volume-bar-toggle-mute-button"]');
      const range = (input) => {
        const min = Number(input.min || 0);
        const max = Number(input.max || 1);
        return { min, max: max > min ? max : min + 1 };
      };
      return {
        get: () => {
          const input = slider();
          if (!input) return null;
          const { min, max } = range(input);
          const volume = (Number(input.value) - min) / (max - min);
          return { volume, muted: volume === 0 };
        },
        set: (v) => {
          const input = slider();
          if (!input) return;
          const { min, max } = range(input);
          // Campo controlado pelo React: usa o setter nativo e avisa com 'input'.
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          setter.call(input, String(min + Math.min(1, Math.max(0, v)) * (max - min)));
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        },
        toggleMute: () => muteBtn()?.click()
      };
    }
    return null;
  }

  function buildVolumeControl(doc, getTarget) {
    const wrap = el(doc, 'div', 'fm-volume');
    const muteBtn = makeButton(doc, '', 'Mudo (M)', () => {
      getTarget()?.toggleMute();
      setTimeout(refresh, 50);
    });
    const slider = doc.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.step = '1';
    slider.title = 'Volume (↑ ↓)';
    slider.setAttribute('aria-label', 'Volume');
    slider.addEventListener('input', () => {
      getTarget()?.set(Number(slider.value) / 100);
      paint(Number(slider.value), Number(slider.value) === 0);
    });
    wrap.append(muteBtn, slider);

    const paint = (percent, muted) => {
      slider.style.setProperty('--fm-fill', `${muted ? 0 : percent}%`);
      const icon = muted || percent === 0 ? 'volumeOff' : percent < 50 ? 'volumeDown' : 'volumeUp';
      setIcon(doc, muteBtn, icon);
      muteBtn.title = muted ? 'Ativar som (M)' : 'Mudo (M)';
    };
    const refresh = () => {
      const state = getTarget()?.get();
      wrap.style.display = state ? '' : 'none';
      if (!state) return;
      const percent = Math.round(state.volume * 100);
      if (doc.activeElement !== slider) slider.value = String(state.muted ? 0 : percent);
      paint(percent, state.muted);
    };
    const step = (delta) => {
      const t = getTarget();
      const state = t?.get();
      if (!state) return;
      t.set((state.muted ? 0 : state.volume) + delta);
      refresh();
    };
    return { node: wrap, refresh, step, toggleMute: () => muteBtn.click() };
  }

  function setIcon(doc, button, name) {
    if (button.dataset.icon === name) return;
    button.dataset.icon = name;
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ICON_PATHS[name]);
    svg.append(path);
    button.replaceChildren(svg);
  }

  function buildMusicWidget(pipWindow) {
    const cfg = SITE_CONTROLS[SITE];
    const doc = preparePipDocument(pipWindow, 'fm-music');

    const main = el(doc, 'div', 'fm-music-main');
    const cover = el(doc, 'img', 'fm-cover');
    cover.alt = '';
    const meta = el(doc, 'div', 'fm-meta');
    const track = el(doc, 'div', 'fm-track');
    const artist = el(doc, 'div', 'fm-artist');
    const progress = el(doc, 'div', 'fm-progress');
    const bar = el(doc, 'div', 'fm-bar');
    progress.append(bar);
    // Área clicável maior que a barra: clicar ou arrastar muda o tempo da música.
    const seekArea = el(doc, 'div', 'fm-seek');
    seekArea.append(progress);
    seekArea.title = 'Clique ou arraste para mudar o tempo';
    let seeking = false;
    const seekTo = (event) => {
      const rect = progress.getBoundingClientRect();
      if (!rect.width || typeof cfg.seek !== 'function') return;
      const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      bar.style.width = `${fraction * 100}%`;
      cfg.seek(fraction);
    };
    seekArea.addEventListener('pointerdown', (e) => {
      seeking = true;
      try {
        seekArea.setPointerCapture(e.pointerId);
      } catch {
        /* sem captura: o arraste funciona só dentro da barra */
      }
      seekTo(e);
    });
    seekArea.addEventListener('pointermove', (e) => seeking && seekTo(e));
    const endSeek = () => {
      seeking = false;
    };
    seekArea.addEventListener('pointerup', endSeek);
    seekArea.addEventListener('pointercancel', endSeek);
    const volume = buildVolumeControl(doc, () => volumeTarget(null));
    meta.append(track, artist, seekArea, volume.node);
    main.append(cover, meta);

    const controls = el(doc, 'div', 'fm-music-controls');
    const playBtn = makeButton(doc, '⏯', 'Play/Pausar', () => {
      if (!siteAction('play')) {
        const v = findMainVideo();
        if (v) v.paused ? v.play() : v.pause();
      }
      setTimeout(refresh, 150);
    });
    playBtn.classList.add('fm-primary');
    // Quando o site não expõe o estado, acompanhamos os cliques feitos aqui.
    const local = { shuffle: false, repeat: 'off' };
    const REPEAT_CYCLE = { off: 'all', all: 'one', one: 'off' };

    const shuffleBtn = makeButton(doc, '', 'Ordem aleatória', () => {
      const before = cfg.state?.();
      if (siteAction('shuffle') && before?.shuffle == null) local.shuffle = !local.shuffle;
      setTimeout(refresh, 250);
    });
    const repeatBtn = makeButton(doc, '', 'Repetir', () => {
      const before = cfg.state?.();
      if (siteAction('repeat') && before?.repeat == null) local.repeat = REPEAT_CYCLE[local.repeat];
      setTimeout(refresh, 250);
    });
    shuffleBtn.classList.add('fm-toggle');
    repeatBtn.classList.add('fm-toggle');

    controls.append(
      shuffleBtn,
      makeButton(doc, '⏮', 'Anterior', () => siteAction('prev')),
      playBtn,
      makeButton(doc, '⏭', 'Próxima', () => siteAction('next')),
      repeatBtn
    );

    const renderToggles = () => {
      const state = cfg.state?.() || {};
      const shuffleOn = state.shuffle ?? local.shuffle;
      const repeatMode = state.repeat ?? local.repeat;
      if (state.shuffle != null) local.shuffle = state.shuffle;
      if (state.repeat != null) local.repeat = state.repeat;

      shuffleBtn.classList.toggle('fm-on', shuffleOn);
      shuffleBtn.title = shuffleOn ? 'Ordem aleatória: ligada' : 'Ordem aleatória: desligada';
      shuffleBtn.setAttribute('aria-pressed', String(shuffleOn));
      setIcon(doc, shuffleBtn, 'shuffle');

      repeatBtn.classList.toggle('fm-on', repeatMode !== 'off');
      repeatBtn.title = { off: 'Repetir: desligado', all: 'Repetir: todas', one: 'Repetir: só esta música' }[repeatMode];
      repeatBtn.dataset.mode = repeatMode;
      setIcon(doc, repeatBtn, repeatMode === 'one' ? 'repeatOne' : 'repeat');
    };

    doc.body.append(main, controls);

    const refresh = () => {
      const root = cfg.root();
      const session = mediaSessionInfo();
      track.textContent = (session?.title || cfg.title(root) || cleanTitle(document.title)).trim();
      artist.textContent = (session?.artist || cfg.artist(root) || '').trim();
      const src = session?.cover || cfg.cover(root);
      if (src && cover.src !== src) cover.src = src;
      cover.style.visibility = src ? 'visible' : 'hidden';
      playBtn.textContent = cfg.isPlaying() ? '⏸' : '▶';
      const p = cfg.progress();
      const pct = p && p.total > 0 ? Math.min(100, (p.current / p.total) * 100) : 0;
      if (!seeking) bar.style.width = `${pct}%`;
      renderToggles();
      volume.refresh();
    };
    refresh();
    const timer = setInterval(refresh, 1000);
    doc.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        volume.step(0.05);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        volume.step(-0.05);
      } else if (e.code === 'KeyM') {
        volume.toggleMute();
      }
    });
    pipWindow.addEventListener('pagehide', () => {
      clearInterval(timer);
      releaseSiteVolume();
    });
  }

  async function toggleFloat() {
    const docPip = window.documentPictureInPicture;
    if (docPip?.window) {
      docPip.window.close();
      return 'closed';
    }
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
      return 'closed';
    }

    const video = IS_MUSIC_SITE ? null : findMainVideo();
    if (!IS_MUSIC_SITE && !video) {
      showToast('Nenhum vídeo encontrado nesta página.');
      return 'no_media';
    }

    // O navegador só abre janelas flutuantes logo após um clique ou tecla
    // NA PÁGINA. Pedidos vindos do popup/menu/atalho global não contam.
    if (navigator.userActivation && !navigator.userActivation.isActive) {
      showClickPrompt();
      return 'needs_click';
    }
    hideClickPrompt();

    if (docPip) {
      try {
        const size = IS_MUSIC_SITE ? MUSIC_WIDGET_SIZE : getVideoPipSize();
        const pipWindow = await docPip.requestWindow({ width: size.width, height: size.height });
        if (IS_MUSIC_SITE) buildMusicWidget(pipWindow);
        else buildVideoWindow(pipWindow, video);
        return 'opened';
      } catch (err) {
        console.warn('[FloatMini] Document Picture-in-Picture falhou:', err);
      }
    }

    // Plano B: Picture-in-Picture clássico (só o vídeo, sem controles extras).
    const fallbackVideo = video || findMainVideo();
    if (fallbackVideo) {
      try {
        await fallbackVideo.requestPictureInPicture();
        return 'opened';
      } catch (err) {
        console.warn('[FloatMini] Picture-in-Picture de vídeo falhou:', err);
      }
    }

    showToast('O navegador não permitiu abrir a janela flutuante nesta página.');
    return 'failed';
  }

  // ---------------------------------------------------------------------------
  // Elementos na página: convite de clique, aviso e botão "Flutuar"
  // ---------------------------------------------------------------------------
  let promptTimer = null;
  let toastTimer = null;

  function hideClickPrompt() {
    clearTimeout(promptTimer);
    document.getElementById('floatmini-prompt')?.remove();
  }

  function showClickPrompt() {
    hideClickPrompt();
    const btn = document.createElement('button');
    btn.id = 'floatmini-prompt';
    btn.type = 'button';
    btn.textContent = '🗗  Clique aqui para abrir a janela flutuante';
    Object.assign(btn.style, {
      position: 'fixed',
      left: '50%',
      bottom: '40px',
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      background: '#2563eb',
      color: '#ffffff',
      border: '1px solid #60a5fa',
      borderRadius: '999px',
      padding: '12px 22px',
      font: '600 14px system-ui, -apple-system, sans-serif',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
      cursor: 'pointer'
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideClickPrompt();
      toggleFloat();
    });
    document.documentElement.append(btn);
    promptTimer = setTimeout(hideClickPrompt, 10000);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    document.getElementById('floatmini-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'floatmini-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      left: '50%',
      bottom: '40px',
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      background: 'rgba(15, 23, 42, 0.95)',
      color: '#f8fafc',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '10px',
      padding: '10px 16px',
      font: '500 13px system-ui, -apple-system, sans-serif',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
      pointerEvents: 'none'
    });
    document.documentElement.append(toast);
    toastTimer = setTimeout(() => toast.remove(), 3500);
  }

  function attachFloatButton() {
    if (document.getElementById('floatmini-trigger-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'floatmini-trigger-btn';
    btn.type = 'button';
    btn.title = 'FloatMini: abrir em janela flutuante sempre no topo (Alt+P)';
    btn.textContent = '🗗 Flutuar';
    const base = 'rgba(15, 23, 42, 0.88)';
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: IS_MUSIC_SITE ? '104px' : '24px', // acima da barra de player do Spotify/YT Music
      right: '24px',
      zIndex: '2147483646',
      background: base,
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      padding: '7px 12px',
      font: '600 12px system-ui, -apple-system, sans-serif',
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
      transition: 'background 0.2s ease'
    });
    btn.addEventListener('mouseenter', () => (btn.style.background = '#2563eb'));
    btn.addEventListener('mouseleave', () => (btn.style.background = base));
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFloat();
    });
    document.body.append(btn);
  }

  // No YouTube e no YouTube Music o botão entra na barra de controles do
  // próprio player, ao lado das outras opções. Nos demais sites (Spotify,
  // sites com vídeo) continua o botão flutuante no canto da tela.
  const NATIVE_BUTTON_ID = 'floatmini-native-btn';
  let nativeButton = null;
  const FLOAT_ICON =
    'M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z';

  // Lugares possíveis para o botão, do melhor para o pior. O layout dos
  // players muda com frequência, então tentamos vários pontos de ancoragem.
  function nativePlacements() {
    const out = [];
    const add = (parent, before = null) => parent && out.push({ parent, before });
    if (SITE === 'youtube') {
      add($('#movie_player .ytp-right-controls-left'), $('#movie_player .ytp-right-controls-left')?.firstChild);
      add($('#movie_player .ytp-right-controls'), $('#movie_player .ytp-right-controls')?.firstChild);
    }
    if (SITE === 'youtube-music') {
      const bar = findYtMusicBar();
      if (bar) {
        // Layout atual (ytmusic-miniplayer): tempo | 👍 👎 | volume | ⋮
        const actionBar = deep$('.ytMusicMiniPlayerActionBar, yt-video-action-bar-view-model', bar);
        if (actionBar) add(actionBar.parentNode, actionBar);
        const rightSection = deep$('.ytMusicMiniPlayerRightSection', bar);
        add(rightSection, rightSection?.firstChild);
        // Antes do "gostei" (layout intermediário)
        const like = deep$('ytmusic-like-button-renderer, #like-button-renderer', bar);
        if (like) add(like.parentNode, like);
        const volume = deep$('#expand-volume, ytmusic-player-expanding-menu, .volume', bar);
        if (volume) add(volume.parentNode, volume);
        const buttons = deep$('.right-controls-buttons', bar);
        add(buttons, buttons?.firstChild);
        const right = deep$('#right-controls', bar);
        add(right, right?.firstChild);
      }
      // Último recurso: acha o 👍 da barra do player pela posição (embaixo da tela).
      const nearBottom = (el) => {
        const rect = el.getBoundingClientRect();
        return rect.height > 0 && rect.top > window.innerHeight - 140;
      };
      const labeled = deepAll('[aria-label]').filter(nearBottom);
      const isDislike = (el) => /(não gostei|dislike)/i.test(el.getAttribute('aria-label'));
      const like = labeled.find((el) => !isDislike(el) && /(gostei|\blike\b|curtir)/i.test(el.getAttribute('aria-label')));
      const dislike = labeled.find(isDislike);
      if (like) {
        let anchor = like;
        while (anchor.parentElement && dislike && !anchor.parentElement.contains(dislike)) anchor = anchor.parentElement;
        add(anchor.parentNode, anchor);
      }
    }
    return out;
  }

  function createNativeButton() {
    const btn = document.createElement('button');
    btn.id = NATIVE_BUTTON_ID;
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Janela flutuante (FloatMini)');
    btn.title = 'Janela flutuante sempre no topo (Alt+P)';
    if (SITE === 'youtube') btn.className = 'ytp-button';
    Object.assign(btn.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      verticalAlign: 'top',
      width: SITE === 'youtube' ? '48px' : '40px',
      height: SITE === 'youtube' ? '100%' : '40px',
      padding: '0',
      margin: SITE === 'youtube-music' ? '0 4px' : '0',
      background: 'transparent',
      border: '0',
      borderRadius: '50%',
      color: '#ffffff',
      cursor: 'pointer',
      opacity: '0.9',
      flexShrink: '0'
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.fill = 'currentColor';
    svg.style.pointerEvents = 'none';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', FLOAT_ICON);
    svg.append(path);
    btn.append(svg);
    btn.addEventListener('mouseenter', () => (btn.style.opacity = '1'));
    btn.addEventListener('mouseleave', () => (btn.style.opacity = '0.9'));
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFloat().finally(() => setTimeout(updateNativeButtonState, 100));
    });
    return btn;
  }

  // Azul enquanto a janela flutuante está aberta.
  function updateNativeButtonState() {
    const btn = nativeButton;
    if (!btn) return;
    const open = !!window.documentPictureInPicture?.window || !!document.pictureInPictureElement;
    btn.setAttribute('aria-pressed', String(open));
    btn.style.color = open ? '#3b82f6' : '#ffffff';
  }

  function refreshFloatButton() {
    if (!document.body) return;

    if (SITE === 'youtube' || SITE === 'youtube-music') {
      let btn = nativeButton;
      if (!btn || !isVisible(btn)) {
        btn = nativeButton = btn || createNativeButton();
        // Testa cada lugar até o botão ficar visível.
        const placed = nativePlacements().some(({ parent, before }) => {
          parent.insertBefore(btn, before && before.parentNode === parent ? before : null);
          return isVisible(btn);
        });
        if (!placed) btn.remove();
      }
      const nativeOk = !!nativeButton?.isConnected;
      updateNativeButtonState();
      if (!nativeOk && SITE === 'youtube-music') refreshFloatButton.misses = (refreshFloatButton.misses || 0) + 1;
      // Só registra depois de ~10s tentando (a barra demora a carregar).
      if (!nativeOk && SITE === 'youtube-music' && refreshFloatButton.misses === 5 && !refreshFloatButton.logged) {
        refreshFloatButton.logged = true;
        const bar = findYtMusicBar();
        console.info(
          '[FloatMini] Não achei onde encaixar o botão na barra do YouTube Music.',
          bar ? `Barra: <${bar.tagName.toLowerCase()} id="${bar.id}" class="${bar.className}">` : 'Barra do player não encontrada.',
          `Shadow roots: ${allRoots().length - 1}`
        );
      }
      // YouTube Music sem barra reconhecível: volta para o botão no canto.
      if (nativeOk || SITE === 'youtube') {
        document.getElementById('floatmini-trigger-btn')?.remove();
        return;
      }
    }

    const hasMedia = IS_MUSIC_SITE || !!document.querySelector('video');
    if (hasMedia) attachFloatButton();
    else document.getElementById('floatmini-trigger-btn')?.remove();
  }
  refreshFloatButton();
  setInterval(refreshFloatButton, 2000);
  // O YouTube troca de página sem recarregar; reposiciona o botão na hora.
  document.addEventListener('yt-navigate-finish', () => setTimeout(refreshFloatButton, 300));

  // ---------------------------------------------------------------------------
  // Atalhos na página. Alt+P precisa ser tratado aqui (e não como atalho da
  // extensão) porque a tecla pressionada na página é o que autoriza o
  // navegador a abrir a janela flutuante.
  // ---------------------------------------------------------------------------
  document.addEventListener(
    'keydown',
    (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return;
      const target = e.target;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || '')) return;
      if (e.code === 'KeyP') {
        e.preventDefault();
        e.stopPropagation();
        toggleFloat();
      }
    },
    true
  );

  // ---------------------------------------------------------------------------
  // Mensagens do popup / background
  // ---------------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const reply = (status) => sendResponse({ status });
    switch (message?.action) {
      case 'PING':
        reply('pong');
        return false;
      case 'TOGGLE_FLOAT':
        toggleFloat().then(reply, () => reply('failed'));
        return true;
      case 'SHOW_FLOAT_PROMPT':
        showClickPrompt();
        reply('prompt');
        return false;
      case 'SEEK': {
        const video = findMainVideo();
        if (!video || SITE === 'spotify') {
          reply('no_media');
        } else {
          seekBy(video, Number(message.seconds) || 0);
          reply('ok');
        }
        return false;
      }
      case 'SHUFFLE':
        reply(siteAction('shuffle') ? 'ok' : 'not_found');
        return false;
      case 'REPEAT':
        reply(siteAction('repeat') ? 'ok' : 'not_found');
        return false;
      default:
        return false;
    }
  });
})();
