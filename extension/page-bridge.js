// FloatMini — ponte com o player do site (roda no "mundo" da página).
//
// Injetado junto com o content.js em sites fora do YouTube/Spotify.
// A Netflix trava (erro M7375) se o tempo do <video> for trocado direto,
// então o avanço/retrocesso usa a API do próprio player da Netflix.
(() => {
  'use strict';
  if (window.__floatminiPageBridge) return;
  window.__floatminiPageBridge = true;

  function netflixPlayer() {
    try {
      const vp = window.netflix.appContext.state.playerApp.getAPI().videoPlayer;
      const ids = vp.getAllPlayerSessionIds();
      return ids.length ? vp.getVideoPlayerBySessionId(ids[ids.length - 1]) : null;
    } catch {
      return null;
    }
  }

  document.addEventListener('floatmini:seek', (event) => {
    let req;
    try {
      req = JSON.parse(event.detail);
    } catch {
      return;
    }
    const seconds = Number(req.time);
    if (!Number.isFinite(seconds) || seconds < 0) return;
    const player = netflixPlayer();
    if (player && typeof player.seek === 'function') player.seek(Math.round(seconds * 1000));
  });
})();
