// FloatMini — ponte de volume (roda no "mundo" da página do YouTube).
//
// O player do YouTube guarda o próprio volume e o reaplica de tempos em
// tempos (troca de qualidade, anúncio, próximo vídeo). Mexer só no elemento
// <video> faz o volume "voltar sozinho". Aqui o content script pede o volume
// e este script usa a API do próprio player, que salva a preferência.
(() => {
  'use strict';
  if (window.__floatminiVolume) return;
  window.__floatminiVolume = true;

  document.addEventListener('floatmini:volume', (event) => {
    let req;
    try {
      req = JSON.parse(event.detail);
    } catch {
      return;
    }
    const percent = Math.round(Math.min(1, Math.max(0, Number(req.volume) || 0)) * 100);

    const player = document.getElementById('movie_player');
    if (player && typeof player.setVolume === 'function') {
      if (!req.muted) player.setVolume(percent);
      if (req.muted) player.mute();
      else player.unMute();
    }

    // YouTube Music: a barra do player tem o próprio controle de volume,
    // que também reaplica o valor dele. Atualiza esse controle.
    const slider = document.querySelector('ytmusic-player-bar #volume-slider');
    if (slider && !req.muted) {
      slider.value = percent;
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
})();
