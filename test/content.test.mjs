// Testes do content script da extensão num DOM simulado (jsdom).
// Rodar: npm test
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const CONTENT_SRC = readFileSync(new URL('../extension/content.js', import.meta.url), 'utf8');

// Fecha toda página simulada no fim de cada teste, mesmo se ele falhar;
// senão os timers do content script mantêm o processo vivo.
const openWindows = [];
afterEach(() => openWindows.splice(0).forEach((w) => w.close()));

/** Cria uma página falsa, injeta o content script e devolve utilidades de teste. */
function loadPage({ url, html, active = false, storage = {}, lang = null }) {
  const source = CONTENT_SRC;
  const dom = new JSDOM(`<!doctype html><html><head><title>Página</title></head><body>${html}</body></html>`, {
    url,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;
  openWindows.push(window);

  // jsdom não calcula layout: considera visível tudo que não estiver [hidden].
  window.Element.prototype.getClientRects = function () {
    return this.closest('[hidden]') ? [] : [{}];
  };

  const userActivation = { isActive: active };
  Object.defineProperty(window.navigator, 'userActivation', { value: userActivation, configurable: true });

  const store = { ...storage };
  let onMessage = null;
  window.chrome = {
    ...(lang ? { i18n: { getUILanguage: () => lang } } : {}),
    runtime: { onMessage: { addListener: (fn) => (onMessage = fn) } },
    storage: {
      local: {
        get: (_keys, cb) => cb({ ...store }),
        set: (values) => Object.assign(store, values)
      },
      onChanged: { addListener: () => {} }
    }
  };

  window.eval(source);

  const send = (message) =>
    new Promise((resolve) => {
      const isAsync = onMessage(message, {}, (res) => resolve(res?.status));
      if (!isAsync) setTimeout(() => resolve(undefined), 0);
    });

  return { window, document: window.document, store, userActivation, send, close: () => window.close() };
}

/** Substitui as propriedades de mídia que o jsdom não implementa. */
function fakeMedia(video, { duration = 30, currentTime = 0, paused = false, muted = false, rate = 1, src = 'a' } = {}) {
  const state = { duration, currentTime, paused, muted, playbackRate: rate, currentSrc: src, volume: 1 };
  for (const key of Object.keys(state)) {
    Object.defineProperty(video, key, { get: () => state[key], set: (v) => (state[key] = v), configurable: true });
  }
  video.play = () => {
    state.paused = false;
    return Promise.resolve();
  };
  video.pause = () => (state.paused = true);
  return state;
}

/** documentPictureInPicture falso: requestWindow devolve outra janela jsdom. */
function fakeDocumentPip(window) {
  const api = {
    window: null,
    requestWindow: async (options) => {
      api.lastRequest = options;
      const pip = new JSDOM('<!doctype html><html><head></head><body></body></html>', { pretendToBeVisual: true }).window;
      api.window = pip;
      pip.close = () => {
        pip.dispatchEvent(new pip.Event('pagehide'));
        api.window = null;
      };
      return pip;
    }
  };
  window.documentPictureInPicture = api;
  return api;
}

const YT_HTML = `
  <div id="container">
    <span id="before"></span>
    <div id="movie_player" class="html5-video-player">
      <video class="html5-main-video"></video>
      <div class="ytp-chrome-bottom"></div>
    </div>
    <span id="after"></span>
  </div>`;

test('pedido sem clique na página mostra o convite em vez de falhar', async () => {
  const page = loadPage({ url: 'https://www.youtube.com/watch?v=abc', html: YT_HTML, active: false });
  fakeMedia(page.document.querySelector('video'));
  fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'needs_click');
  assert.ok(page.document.getElementById('floatmini-prompt'), 'convite "Clique aqui" deve aparecer');
  page.close();
});

test('Alt+P na página abre a janela flutuante com o vídeo e devolve ao fechar', async () => {
  const page = loadPage({ url: 'https://www.youtube.com/watch?v=abc', html: YT_HTML, active: true });
  const video = page.document.querySelector('video');
  fakeMedia(video);
  const docPip = fakeDocumentPip(page.window);

  page.document.dispatchEvent(new page.window.KeyboardEvent('keydown', { code: 'KeyP', altKey: true, bubbles: true }));
  await new Promise((r) => setTimeout(r, 10));

  assert.ok(docPip.window, 'janela flutuante aberta');
  const pipDoc = docPip.window.document;
  assert.equal(video.ownerDocument, pipDoc, 'o vídeo foi movido para a janela flutuante');
  // Visual minimalista: ícones SVG (sem emojis), com dica no title.
  const icons = Object.fromEntries([...pipDoc.querySelectorAll('.fm-overlay-bottom .fm-btn')].map((b) => [b.title, b.dataset.icon]));
  assert.equal(icons['Voltar 10 segundos (←)'], 'rewind');
  assert.equal(icons['Avançar 10 segundos (→)'], 'forward');
  assert.ok(pipDoc.querySelector('.fm-shade'), 'degradê embaixo dos controles');

  // Alt+P de novo fecha e o vídeo volta exatamente para o mesmo lugar.
  page.document.dispatchEvent(new page.window.KeyboardEvent('keydown', { code: 'KeyP', altKey: true, bubbles: true }));
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(docPip.window, null);
  assert.equal(video.parentElement.id, 'movie_player');
  assert.equal(video.nextElementSibling.className, 'ytp-chrome-bottom', 'voltou para a mesma posição');
  page.close();
});

test('-10s / +10s respeitam o início e o fim do vídeo', async () => {
  const page = loadPage({ url: 'https://www.youtube.com/watch?v=abc', html: YT_HTML });
  const media = fakeMedia(page.document.querySelector('video'), { duration: 100, currentTime: 5 });
  await page.send({ action: 'SEEK', seconds: -10 });
  assert.equal(media.currentTime, 0);
  media.currentTime = 95;
  await page.send({ action: 'SEEK', seconds: 10 });
  assert.equal(media.currentTime, 100);
  page.close();
});

test('título da página entra como texto, não como HTML', async () => {
  const page = loadPage({ url: 'https://www.youtube.com/watch?v=abc', html: YT_HTML, active: true });
  fakeMedia(page.document.querySelector('video'));
  const docPip = fakeDocumentPip(page.window);
  page.document.title = '<img src=x onerror="alert(1)"> - YouTube';
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  assert.equal(pipDoc.querySelector('img'), null);
  assert.equal(pipDoc.title, '<img src=x onerror="alert(1)">');
  page.close();
});

test('Spotify: mini player mostra a faixa e controla os botões do site', async () => {
  const html = `
    <div data-testid="now-playing-widget">
      <img data-testid="cover-art-image" src="https://i.scdn.co/image/capa">
      <a data-testid="context-item-link">Minha Música</a>
      <a data-testid="context-item-info-artist">Artista</a>
    </div>
    <footer>
      <button data-testid="control-button-skip-back">prev</button>
      <button data-testid="control-button-playpause" aria-label="Pausar">pp</button>
      <button data-testid="control-button-skip-forward">next</button>
      <button data-testid="control-button-shuffle">shuffle</button>
      <button data-testid="control-button-repeat">repeat</button>
      <span data-testid="playback-position">1:00</span>
      <span data-testid="playback-duration">4:00</span>
    </footer>`;
  const page = loadPage({ url: 'https://open.spotify.com/', html, active: true });
  const docPip = fakeDocumentPip(page.window);
  let nextClicks = 0;
  page.document.querySelector('[data-testid="control-button-skip-forward"]').addEventListener('click', () => nextClicks++);

  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  assert.equal(pipDoc.querySelector('.fm-track').textContent, 'Minha Música');
  assert.equal(pipDoc.querySelector('.fm-artist').textContent, 'Artista');
  assert.equal(pipDoc.querySelector('.fm-bar').style.width, '25%');
  assert.equal(pipDoc.querySelector('.fm-primary').dataset.icon, 'pause', 'aria-label "Pausar" = tocando');

  pipDoc.querySelector('button[title="Próxima"]').click();
  assert.equal(nextClicks, 1);
  assert.equal(await page.send({ action: 'SHUFFLE' }), 'ok');
  page.close();
});

test('site sem vídeo responde no_media', async () => {
  const page = loadPage({ url: 'https://example.com/', html: '<p>texto</p>', active: true });
  fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'no_media');
  assert.equal(await page.send({ action: 'SHUFFLE' }), 'not_found');
  page.close();
});

test('injetar o script duas vezes não duplica nada', () => {
  const page = loadPage({ url: 'https://example.com/', html: '<video></video>' });
  page.window.eval(CONTENT_SRC);
  // Site sem barra de player reconhecível: ícone em cima do vídeo, não no canto.
  assert.equal(page.document.querySelectorAll('#floatmini-video-btn').length, 1);
  assert.equal(page.document.querySelectorAll('#floatmini-trigger-btn').length, 0);
  page.close();
});

test('YouTube Music: aleatório/repetir clicam no <button> interno do componente', async () => {
  const html = `
    <ytmusic-player-bar>
      <div class="middle-controls"><yt-formatted-string class="title">Faixa</yt-formatted-string></div>
      <div id="right-controls">
        <yt-icon-button class="shuffle"><button id="inner-shuffle"></button></yt-icon-button>
        <yt-icon-button class="repeat"><button id="inner-repeat"></button></yt-icon-button>
      </div>
    </ytmusic-player-bar>`;
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=abc', html });
  const hits = [];
  page.document.getElementById('inner-shuffle').addEventListener('click', () => hits.push('shuffle'));
  page.document.getElementById('inner-repeat').addEventListener('click', () => hits.push('repeat'));
  assert.equal(await page.send({ action: 'SHUFFLE' }), 'ok');
  assert.equal(await page.send({ action: 'REPEAT' }), 'ok');
  assert.deepEqual(hits, ['shuffle', 'repeat']);
});

test('YouTube Music: sem os botões na página, usa os atalhos S e R do site', async () => {
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=abc', html: '<div id="layout"></div>' });
  const keys = [];
  page.document.addEventListener('keydown', (e) => keys.push(e.key));
  assert.equal(await page.send({ action: 'SHUFFLE' }), 'ok');
  assert.equal(await page.send({ action: 'REPEAT' }), 'ok');
  assert.deepEqual(keys, ['s', 'r']);
});

test('YouTube Music: mini player usa os metadados da Media Session', async () => {
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=abc', html: '<video></video>', active: true });
  fakeMedia(page.document.querySelector('video'));
  Object.defineProperty(page.window.navigator, 'mediaSession', {
    value: {
      metadata: {
        title: 'All Girls Are The Same',
        artist: 'Juice WRLD',
        artwork: [{ src: 'https://lh3.example/p.jpg', sizes: '60x60' }, { src: 'https://lh3.example/g.jpg', sizes: '544x544' }]
      }
    },
    configurable: true
  });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  assert.equal(pipDoc.querySelector('.fm-track').textContent, 'All Girls Are The Same');
  assert.equal(pipDoc.querySelector('.fm-artist').textContent, 'Juice WRLD');
  assert.equal(pipDoc.querySelector('.fm-cover').src, 'https://lh3.example/g.jpg');
});

test('título "Faixa | YouTube Music" perde o sufixo', async () => {
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=abc', html: '<video></video>', active: true });
  fakeMedia(page.document.querySelector('video'));
  page.document.title = 'All Girls Are The Same | YouTube Music';
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  assert.equal(docPip.window.document.querySelector('.fm-track').textContent, 'All Girls Are The Same');
});

function musicBar({ repeatTitle, shufflePressed } = {}) {
  return `
    <ytmusic-player-bar>
      <div id="right-controls">
        <yt-icon-button class="shuffle"><button id="s" ${shufflePressed === undefined ? '' : `aria-pressed="${shufflePressed}"`}></button></yt-icon-button>
        <yt-icon-button class="repeat" ${repeatTitle ? `title="${repeatTitle}"` : ''}><button id="r"></button></yt-icon-button>
      </div>
    </ytmusic-player-bar><video></video>`;
}

async function openMusicWidget(url, html) {
  const page = loadPage({ url, html, active: true });
  const v = page.document.querySelector('video');
  if (v) fakeMedia(v);
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  const [shuffleBtn] = pipDoc.querySelectorAll('.fm-toggle');
  const repeatBtn = pipDoc.querySelectorAll('.fm-toggle')[1];
  return { page, pipDoc, shuffleBtn, repeatBtn };
}

test('YouTube Music: ícones mostram repetir tudo / só esta / desligado e aleatório', async () => {
  for (const [title, mode, on] of [['Repetir tudo', 'all', true], ['Repetir uma', 'one', true], ['Repetição desativada', 'off', false]]) {
    const { shuffleBtn, repeatBtn } = await openMusicWidget(
      'https://music.youtube.com/watch?v=a',
      musicBar({ repeatTitle: title, shufflePressed: true })
    );
    assert.equal(repeatBtn.dataset.mode, mode, title);
    assert.equal(repeatBtn.classList.contains('fm-on'), on, title);
    assert.equal(repeatBtn.dataset.icon, mode === 'one' ? 'repeatOne' : 'repeat');
    assert.equal(shuffleBtn.classList.contains('fm-on'), true);
  }
});

test('YouTube Music: atributo repeat-mode da barra tem prioridade', async () => {
  const html = musicBar({ repeatTitle: 'Repetir tudo' }).replace('<ytmusic-player-bar>', '<ytmusic-player-bar repeat-mode_="ONE">');
  const { repeatBtn } = await openMusicWidget('https://music.youtube.com/watch?v=a', html);
  assert.equal(repeatBtn.dataset.mode, 'one');
});

test('sem estado no site, o ícone acompanha os cliques (desligado → tudo → uma → desligado)', async () => {
  const { repeatBtn, shuffleBtn } = await openMusicWidget('https://music.youtube.com/watch?v=a', musicBar());
  const modes = [repeatBtn.dataset.mode];
  for (let i = 0; i < 3; i++) {
    repeatBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    modes.push(repeatBtn.dataset.mode);
  }
  assert.deepEqual(modes, ['off', 'all', 'one', 'off']);
  shuffleBtn.click();
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(shuffleBtn.classList.contains('fm-on'), true);
});

test('Spotify: aria-checked define aleatório e repetir (mixed = só esta)', async () => {
  const html = `
    <button data-testid="control-button-shuffle" aria-checked="true"></button>
    <button data-testid="control-button-repeat" aria-checked="mixed"></button>`;
  const { shuffleBtn, repeatBtn } = await openMusicWidget('https://open.spotify.com/', html);
  assert.equal(shuffleBtn.classList.contains('fm-on'), true);
  assert.equal(repeatBtn.dataset.mode, 'one');
  assert.equal(repeatBtn.dataset.icon, 'repeatOne');
});

test('YouTube: botão Flutuar entra na barra de controles do player', async () => {
  const html = `<div id="movie_player"><video class="html5-main-video"></video>
    <div class="ytp-chrome-bottom"><div class="ytp-right-controls"><button class="ytp-settings-button"></button></div></div></div>`;
  const page = loadPage({ url: 'https://www.youtube.com/watch?v=a', html, active: true });
  fakeMedia(page.document.querySelector('video'));
  const docPip = fakeDocumentPip(page.window);
  const btn = page.document.getElementById('floatmini-native-btn');
  assert.ok(btn, 'botão nativo criado');
  assert.equal(btn.parentElement.className, 'ytp-right-controls');
  assert.equal(btn.parentElement.firstElementChild, btn, 'primeiro da barra');
  assert.equal(page.document.getElementById('floatmini-trigger-btn'), null, 'sem botão solto no canto');
  btn.click();
  await new Promise((r) => setTimeout(r, 200));
  assert.ok(docPip.window, 'clique abre a janela flutuante');
  assert.equal(btn.getAttribute('aria-pressed'), 'true');
});

test('YouTube Music: botão Flutuar entra nos controles da barra do player', () => {
  const html = `<ytmusic-player-bar><div id="right-controls"><div class="right-controls-buttons"><yt-icon-button class="volume"></yt-icon-button></div></div></ytmusic-player-bar>`;
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html });
  const btn = page.document.getElementById('floatmini-native-btn');
  assert.equal(btn?.parentElement.className, 'right-controls-buttons');
  assert.equal(page.document.getElementById('floatmini-trigger-btn'), null);
});

test('Spotify e outros sites mantêm o botão no canto', () => {
  const page = loadPage({ url: 'https://open.spotify.com/', html: '<footer></footer>' });
  assert.ok(page.document.getElementById('floatmini-trigger-btn'));
  assert.equal(page.document.getElementById('floatmini-native-btn'), null);
});

test('YouTube Music (layout novo): botão entra antes do "gostei" na barra do player', () => {
  const html = `<ytmusic-player-bar>
      <div class="middle-controls"></div>
      <div id="right-controls"><div class="right-controls-buttons" hidden></div>
        <span class="time-info">0:27 / 3:12</span>
        <ytmusic-like-button-renderer id="like-button-renderer"></ytmusic-like-button-renderer>
        <ytmusic-player-expanding-menu id="expand-volume"></ytmusic-player-expanding-menu>
      </div>
    </ytmusic-player-bar>`;
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html });
  const btn = page.document.getElementById('floatmini-native-btn');
  assert.ok(btn);
  assert.equal(btn.nextElementSibling.id, 'like-button-renderer');
  assert.equal(page.document.getElementById('floatmini-trigger-btn'), null);
});

test('YouTube Music sem barra reconhecível: usa o botão no canto', () => {
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html: '<div id="app"></div>' });
  assert.equal(page.document.getElementById('floatmini-native-btn'), null);
  assert.ok(page.document.getElementById('floatmini-trigger-btn'));
});

test('YouTube Music com Shadow DOM: acha a barra, encaixa o botão e clica no aleatório', async () => {
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html: '<ytmusic-app id="app"></ytmusic-app>' });
  const { document } = page;
  // Barra do player escondida dentro de um shadow root
  const host = document.getElementById('app');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<ytmusic-player-bar>
      <yt-icon-button class="shuffle"><button id="s"></button></yt-icon-button>
      <span>0:47 / 3:12</span>
      <ytmusic-like-button-renderer id="like-button-renderer"></ytmusic-like-button-renderer>
    </ytmusic-player-bar>`;
  let shuffles = 0;
  shadow.getElementById('s').addEventListener('click', () => shuffles++);

  await new Promise((r) => setTimeout(r, 2200)); // próximo ciclo do botão (2s)
  const btn = shadow.getElementById('floatmini-native-btn');
  assert.ok(btn, 'botão dentro da barra no shadow root');
  assert.equal(btn.nextElementSibling.id, 'like-button-renderer');
  assert.equal(document.getElementById('floatmini-trigger-btn'), null, 'botão do canto removido');

  assert.equal(await page.send({ action: 'SHUFFLE' }), 'ok');
  assert.equal(shuffles, 1);
});

// Estrutura real do YouTube Music (out/2026), copiada do navegador do usuário.
const YTM_MINIPLAYER = `
  <div id="player-bar-background"></div>
  <ytmusic-miniplayer>
    <div class="ytMusicMiniPlayerLeftSection">
      <ytmusic-track-info class="ytmusicTrackInfoHost">
        <img class="ytmusicTrackInfoThumbnail" src="https://lh3.example/capa.jpg">
        <div class="ytmusicTrackInfoContentInfoWrapper">
          <div class="ytmusicTrackInfoTitle">Life's A Mess</div>
          <div class="ytmusicTrackInfoByline"><span>Juice WRLD e Halsey • Legends Never Die • 2020</span></div>
        </div>
      </ytmusic-track-info>
    </div>
    <div class="ytMusicMiniPlayerMiddleSection">
      <ytmusic-wiz-player-controls><div class="ytmusicPlayerControlsMainControls">
        <div class="ytmusicPlayerControlsControlButton ytmusicPlayerControlsShuffleButton"><button aria-label="Ordem aleatória" id="ytm-shuffle"></button></div>
        <div class="ytmusicPlayerControlsControlButton ytmusicPlayerControlsPreviousButton"><button aria-label="Anterior" id="ytm-prev"></button></div>
        <div class="ytmusicPlayerControlsControlButton ytmusicPlayerControlsPlayPauseButton"><button aria-label="Pausar" id="ytm-play"></button></div>
        <div class="ytmusicPlayerControlsControlButton ytmusicPlayerControlsNextButton"><button aria-label="Avançar" id="ytm-next"></button></div>
        <div class="ytmusicPlayerControlsControlButton ytmusicPlayerControlsRepeatButton"><button aria-label="Repetição desativada" id="ytm-repeat"></button></div>
      </div></ytmusic-wiz-player-controls>
    </div>
    <div class="ytMusicMiniPlayerRightSection">
      <div class="ytMusicMiniPlayerTimeInfo">0:47 / 3:12</div>
      <yt-video-action-bar-view-model class="ytVideoActionBarViewModelHost ytMusicMiniPlayerActionBar">
        <button aria-label='marcar este vídeo como "Gostei" com mais 334.070 pessoas'></button>
        <button aria-label="Não gostei deste vídeo"></button>
      </yt-video-action-bar-view-model>
      <div class="ytMusicMiniPlayerVolumeWrapper"></div>
      <div class="ytMusicMiniPlayerMuteButton"><button aria-label="Desativar som"></button></div>
      <div class="ytMusicMiniPlayerMenuButton"><button aria-label="MORE"></button></div>
    </div>
  </ytmusic-miniplayer>`;

test('YouTube Music (miniplayer atual): botão entra entre o tempo e o 👍', () => {
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html: YTM_MINIPLAYER });
  const btn = page.document.getElementById('floatmini-native-btn');
  assert.ok(btn);
  assert.equal(btn.previousElementSibling.className, 'ytMusicMiniPlayerTimeInfo');
  assert.ok(btn.nextElementSibling.classList.contains('ytMusicMiniPlayerActionBar'));
  assert.equal(page.document.getElementById('floatmini-trigger-btn'), null);
});

test('YouTube Music (miniplayer atual): controles, faixa e estado de repetir', async () => {
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html: YTM_MINIPLAYER + '<video></video>', active: true });
  fakeMedia(page.document.querySelector('video'));
  const clicks = [];
  for (const id of ['ytm-shuffle', 'ytm-prev', 'ytm-play', 'ytm-next', 'ytm-repeat']) {
    page.document.getElementById(id).addEventListener('click', () => clicks.push(id));
  }
  const keys = [];
  page.document.addEventListener('keydown', (e) => keys.push(e.key));

  assert.equal(await page.send({ action: 'SHUFFLE' }), 'ok');
  assert.equal(await page.send({ action: 'REPEAT' }), 'ok');
  assert.deepEqual(clicks, ['ytm-shuffle', 'ytm-repeat']);
  assert.deepEqual(keys, [], 'clicou nos botões reais, sem precisar dos atalhos');

  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  assert.equal(pipDoc.querySelector('.fm-track').textContent, "Life's A Mess");
  assert.equal(pipDoc.querySelector('.fm-cover').src, 'https://lh3.example/capa.jpg');
  const repeatBtn = pipDoc.querySelectorAll('.fm-toggle')[1];
  assert.equal(repeatBtn.dataset.mode, 'off', '"Repetição desativada" = desligado');

  page.document.getElementById('ytm-repeat').setAttribute('aria-label', 'Repetir uma');
  pipDoc.querySelector('button[title="Próxima"]').click();
  assert.equal(clicks.at(-1), 'ytm-next');
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal(repeatBtn.dataset.mode, 'one');
});

test('janela de vídeo: volume pelo controle deslizante, mudo e setas', async () => {
  const page = loadPage({ url: 'https://www.youtube.com/watch?v=a', html: YT_HTML, active: true });
  const media = fakeMedia(page.document.querySelector('video'));
  media.volume = 0.8;
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  const slider = pipDoc.querySelector('.fm-volume input[type="range"]');
  const muteBtn = pipDoc.querySelector('.fm-volume .fm-btn');
  assert.equal(slider.value, '80');
  const asked = [];
  page.document.addEventListener('floatmini:volume', (e) => asked.push(JSON.parse(e.detail)));

  slider.value = '30';
  slider.dispatchEvent(new docPip.window.Event('input'));
  assert.ok(Math.abs(media.volume - 0.3) < 1e-9);
  // Pede ao player do YouTube para guardar o volume (senão ele volta sozinho).
  assert.ok(asked.length > 0 && Math.abs(asked.at(-1).volume - 0.3) < 1e-9 && !asked.at(-1).muted);
  assert.equal(muteBtn.dataset.icon, 'volumeDown');

  muteBtn.click();
  assert.equal(media.muted, true);
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(muteBtn.dataset.icon, 'volumeOff');
  muteBtn.click();
  assert.equal(media.muted, false);

  pipDoc.dispatchEvent(new docPip.window.KeyboardEvent('keydown', { code: 'ArrowUp' }));
  assert.ok(Math.abs(media.volume - 0.35) < 1e-9);
});

test('YouTube Music: mini player tem volume ligado ao áudio da página', async () => {
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html: YTM_MINIPLAYER + '<video></video>', active: true });
  const media = fakeMedia(page.document.querySelector('video'));
  media.volume = 0.5;
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const slider = docPip.window.document.querySelector('.fm-volume input[type="range"]');
  assert.equal(slider.value, '50');
  slider.value = '0';
  slider.dispatchEvent(new docPip.window.Event('input'));
  assert.equal(media.muted, true);
});

test('janela de vídeo limpa: sem título por cima e controles que somem sozinhos', async () => {
  const page = loadPage({ url: 'https://www.youtube.com/watch?v=a', html: YT_HTML, active: true });
  const media = fakeMedia(page.document.querySelector('video'));
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  assert.equal(pipDoc.querySelector('.fm-overlay-top, .fm-title'), null, 'nada por cima do vídeo');
  assert.ok(pipDoc.body.classList.contains('fm-active'), 'controles aparecem ao abrir');

  await new Promise((r) => setTimeout(r, 2200));
  assert.ok(!pipDoc.body.classList.contains('fm-active'), 'somem depois de 2s parado');

  pipDoc.dispatchEvent(new docPip.window.MouseEvent('mousemove'));
  assert.ok(pipDoc.body.classList.contains('fm-active'), 'voltam ao mexer o mouse');

  media.paused = true;
  await new Promise((r) => setTimeout(r, 2200));
  assert.ok(pipDoc.body.classList.contains('fm-active'), 'ficam visíveis com o vídeo pausado');
});

test('ponte de volume: usa a API do player e desfaz mudanças do site', async () => {
  const { JSDOM } = await import('jsdom');
  const { readFileSync } = await import('node:fs');
  const dom = new JSDOM('<div id="movie_player"></div><div id="volume-slider"></div>', { runScripts: 'outside-only' });
  const doc = dom.window.document;
  const player = doc.getElementById('movie_player');
  const state = { volume: 100, muted: false };
  player.setVolume = (v) => (state.volume = v);
  player.getVolume = () => state.volume;
  player.mute = () => (state.muted = true);
  player.unMute = () => (state.muted = false);
  player.isMuted = () => state.muted;
  const slider = doc.getElementById('volume-slider');
  slider.value = 100;
  dom.window.eval(readFileSync(new URL('../extension/yt-volume.js', import.meta.url), 'utf8'));
  const send = (d) => doc.dispatchEvent(new dom.window.CustomEvent('floatmini:volume', { detail: JSON.stringify(d) }));

  send({ volume: 0.25, muted: false });
  assert.equal(state.volume, 25);
  assert.equal(slider.value, 25);

  // O site reaplica o volume dele sozinho → volta para 25.
  state.volume = 100;
  doc.dispatchEvent(new dom.window.Event('volumechange'));
  assert.equal(state.volume, 25);

  send({ volume: 0.25, muted: true });
  assert.equal(state.muted, true);

  // A pessoa mexe no volume do próprio site (layout novo do YT Music):
  // o site passa a valer e a extensão não desfaz mais.
  send({ volume: 0.25, muted: false });
  const siteVolume = doc.createElement('div');
  siteVolume.className = 'ytmusicPlayerVolumeSlider';
  doc.body.append(siteVolume);
  siteVolume.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true }));
  state.volume = 80;
  doc.dispatchEvent(new dom.window.Event('volumechange'));
  assert.equal(state.volume, 80);

  // Mexer em outra coisa da página não libera.
  send({ volume: 0.3, muted: false });
  doc.body.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true }));
  state.volume = 100;
  doc.dispatchEvent(new dom.window.Event('volumechange'));
  assert.equal(state.volume, 30);

  // Janela fechada: a extensão para de corrigir o volume.
  doc.dispatchEvent(new dom.window.CustomEvent('floatmini:volume', { detail: JSON.stringify({ release: true }) }));
  state.volume = 90;
  doc.dispatchEvent(new dom.window.Event('volumechange'));
  assert.equal(state.volume, 90);
  dom.window.close();
});

test('YouTube Music: clicar na barra de progresso muda o tempo da música', async () => {
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html: YTM_MINIPLAYER.replace('0:47 / 3:12', '') + '<video></video>', active: true });
  const media = fakeMedia(page.document.querySelector('video'), { duration: 200, currentTime: 10 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  const seek = pipDoc.querySelector('.fm-seek');
  assert.ok(seek, 'barra de progresso clicável');
  pipDoc.querySelector('.fm-progress').getBoundingClientRect = () => ({ left: 100, width: 200, top: 0, height: 3 });
  seek.dispatchEvent(new docPip.window.MouseEvent('pointerdown', { clientX: 150, bubbles: true }));
  assert.equal(media.currentTime, 50); // 25% de 200 s
  seek.dispatchEvent(new docPip.window.MouseEvent('pointermove', { clientX: 250, bubbles: true }));
  assert.equal(media.currentTime, 150);
  seek.dispatchEvent(new docPip.window.MouseEvent('pointerup', { bubbles: true }));
  seek.dispatchEvent(new docPip.window.MouseEvent('pointermove', { clientX: 300, bubbles: true }));
  assert.equal(media.currentTime, 150, 'sem arrastar, mover o mouse não muda o tempo');
});

test('janela de vídeo: linha do tempo mostra o tempo e muda a posição', async () => {
  const page = loadPage({ url: 'https://www.youtube.com/watch?v=a', html: YT_HTML, active: true });
  const media = fakeMedia(page.document.querySelector('video'), { duration: 600, currentTime: 65 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  const timeline = pipDoc.querySelector('.fm-timeline');
  assert.ok(timeline && !timeline.hidden);
  const [now, total] = timeline.querySelectorAll('.fm-time');
  assert.equal(now.textContent, '1:05');
  assert.equal(total.textContent, '10:00');

  const scrub = timeline.querySelector('input[type="range"]');
  scrub.value = '500';
  scrub.dispatchEvent(new docPip.window.Event('input'));
  assert.equal(media.currentTime, 300);
  scrub.dispatchEvent(new docPip.window.Event('change'));
  assert.equal(now.textContent, '5:00');

  // Ao vivo (sem duração): some.
  media.duration = Infinity;
  pipDoc.querySelector('video').dispatchEvent(new docPip.window.Event('durationchange'));
  assert.equal(timeline.hidden, true);
});

test('Netflix: avançar usa a API do player em vez de mexer no <video>', async () => {
  const page = loadPage({ url: 'https://www.netflix.com/watch/1', html: '<div class="watch-video"><video></video></div>', active: true });
  const media = fakeMedia(page.document.querySelector('video'), { duration: 3000, currentTime: 100 });
  const docPip = fakeDocumentPip(page.window);
  const asked = [];
  page.document.addEventListener('floatmini:seek', (e) => asked.push(JSON.parse(e.detail).time));
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const fwd = [...docPip.window.document.querySelectorAll('.fm-btn')].find((b) => b.title.startsWith('Avançar'));
  fwd.click();
  assert.deepEqual(asked, [110]);
  assert.equal(media.currentTime, 100, 'o <video> da Netflix não é alterado direto');
});

test('legendas do site aparecem na janela flutuante', async () => {
  const html = '<div class="watch-video"><video></video><div class="player-timedtext"><div class="player-timedtext-text-container"></div></div></div>';
  const page = loadPage({ url: 'https://www.netflix.com/watch/1', html, active: true });
  fakeMedia(page.document.querySelector('video'), { duration: 3000 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const captions = docPip.window.document.querySelector('.fm-captions');
  assert.equal(captions.textContent, '');
  page.document.querySelector('.player-timedtext-text-container').textContent = 'Olá, mundo';
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(captions.textContent, 'Olá, mundo');
  page.document.querySelector('.player-timedtext-text-container').textContent = '';
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(captions.textContent, '');
});

test('ponte da página: seek na Netflix vira milissegundos na API do player', async () => {
  const { JSDOM } = await import('jsdom');
  const { readFileSync } = await import('node:fs');
  const dom = new JSDOM('', { runScripts: 'outside-only' });
  const seeks = [];
  const player = { seek: (ms) => seeks.push(ms) };
  dom.window.netflix = {
    appContext: {
      state: {
        playerApp: {
          getAPI: () => ({
            videoPlayer: { getAllPlayerSessionIds: () => ['s1'], getVideoPlayerBySessionId: () => player }
          })
        }
      }
    }
  };
  dom.window.eval(readFileSync(new URL('../extension/page-bridge.js', import.meta.url), 'utf8'));
  dom.window.document.dispatchEvent(new dom.window.CustomEvent('floatmini:seek', { detail: JSON.stringify({ time: 12.5 }) }));
  assert.deepEqual(seeks, [12500]);
  dom.window.close();
});

test('TikTok/Shorts: rolar na janela troca para o próximo vídeo do feed e devolve o anterior', async () => {
  const html = `<div id="feed">
    <div class="item"><video id="v1"></video></div>
    <div class="item"><video id="v2"></video></div>
  </div><button data-e2e="arrow-down">↓</button><button data-e2e="arrow-up">↑</button>`;
  const page = loadPage({ url: 'https://www.tiktok.com/foryou', html, active: true });
  const v1 = page.document.getElementById('v1');
  const v2 = page.document.getElementById('v2');
  const m1 = fakeMedia(v1, { duration: 20 });
  const m2 = fakeMedia(v2, { duration: 15, paused: true });
  // O site: a seta para baixo pausa o atual e toca o próximo.
  page.document.querySelector('[data-e2e="arrow-down"]').addEventListener('click', () => {
    m1.paused = true;
    m2.paused = false;
  });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  assert.equal(pipDoc.querySelector('.fm-stage video').id, 'v1');
  // Rolar para baixo na janela passa para o próximo vídeo.
  pipDoc.querySelector('.fm-stage').dispatchEvent(new docPip.window.WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(pipDoc.querySelector('.fm-stage video').id, 'v2');
  assert.ok(page.document.querySelector('#feed .item video#v1'), 'o vídeo anterior volta para o lugar dele');
  docPip.window.close();
  assert.ok(page.document.querySelector('#feed .item video#v2'), 'ao fechar, o vídeo atual volta para o feed');
});

test('vídeo comum: rolar na janela não troca de vídeo e ↑ ↓ continuam no volume', async () => {
  const page = loadPage({ url: 'https://www.youtube.com/watch?v=a', html: YT_HTML, active: true });
  const media = fakeMedia(page.document.querySelector('video'));
  media.volume = 0.5;
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  pipDoc.querySelector('.fm-stage').dispatchEvent(new docPip.window.WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 200));
  assert.ok(pipDoc.querySelector('.fm-stage video'));
  pipDoc.dispatchEvent(new docPip.window.KeyboardEvent('keydown', { code: 'ArrowUp' }));
  assert.ok(Math.abs(media.volume - 0.55) < 1e-9);
  assert.equal(pipDoc.querySelectorAll('.fm-feed').length, 0);
});

test('legendas: site desconhecido (ex.: Globoplay) com classe de legenda perto do player', async () => {
  const html = `<div class="player"><div class="media"><video></video></div>
    <div class="settings-menu" role="menu"><div class="subtitle-option">Legendas: Português</div></div>
    <div class="title-subtitle">Subtítulo: Origem</div>
    <div class="caption-rating">Classificação etária: 16 anos</div>
    <div class="player-subtitles"><span class="subtitle-line">Primeira fala</span></div>
    <div class="controls"><button class="caption-toggle">CC</button></div></div>`;
  const page = loadPage({ url: 'https://globoplay.globo.com/v/123/', html, active: true });
  fakeMedia(page.document.querySelector('video'), { duration: 3000 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  await new Promise((r) => setTimeout(r, 300));
  const captions = docPip.window.document.querySelector('.fm-captions');
  // Texto parado desde que a janela abriu (título, classificação) não entra.
  assert.equal(captions.textContent, '');
  page.document.querySelector('.subtitle-line').textContent = 'Bom dia, Brasil!';
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(captions.textContent, 'Bom dia, Brasil!');
  // Fala nova num elemento novo também entra.
  page.document.querySelector('.player-subtitles').innerHTML = '<span class="subtitle-line">Tudo bem?</span>';
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(captions.textContent, 'Tudo bem?');
  page.document.querySelector('.player-subtitles').innerHTML = '';
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(captions.textContent, '');
});

test('legendas: faixa de texto escondida (players com legenda própria)', async () => {
  const page = loadPage({ url: 'https://exemplo.com/assistir', html: '<div><video></video></div>', active: true });
  const video = page.document.querySelector('video');
  fakeMedia(video, { duration: 100 });
  const track = { kind: 'subtitles', mode: 'hidden', activeCues: [{ text: '<i>Olá</i> de novo' }] };
  Object.defineProperty(video, 'textTracks', { value: [track], configurable: true });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(docPip.window.document.querySelector('.fm-captions').textContent, 'Olá de novo');
  track.mode = 'showing'; // o navegador já desenha: não duplica
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(docPip.window.document.querySelector('.fm-captions').textContent, '');
});

test('fechar a janela flutuante libera o volume do site', async () => {
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html: YTM_MINIPLAYER + '<video></video>', active: true });
  fakeMedia(page.document.querySelector('video'));
  const asked = [];
  page.document.addEventListener('floatmini:volume', (e) => asked.push(JSON.parse(e.detail)));
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  docPip.window.close();
  assert.deepEqual(asked.at(-1), { release: true });
});

test('YouTube Music: na troca de faixa a barra segue o <video> que está tocando', async () => {
  const html = YTM_MINIPLAYER.replace('0:47 / 3:12', '') + '<video class="html5-main-video" id="old"></video><video id="new"></video>';
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html, active: true });
  // Música anterior terminou (parada no fim); a nova toca no outro <video>.
  fakeMedia(page.document.getElementById('old'), { duration: 200, currentTime: 200, paused: true });
  fakeMedia(page.document.getElementById('new'), { duration: 100, currentTime: 10 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  assert.equal(docPip.window.document.querySelector('.fm-bar').style.width, '10%');
});

test('feed (TikTok/Reels/Shorts): só setas na lateral e volume; clique pausa', async () => {
  const html = '<div id="feed"><div class="item"><video id="v1"></video></div></div>';
  const page = loadPage({ url: 'https://www.instagram.com/reels/abc/', html, active: true });
  const media = fakeMedia(page.document.getElementById('v1'), { duration: 20 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  assert.ok(pipDoc.body.classList.contains('fm-feed'));
  const nav = [...pipDoc.querySelectorAll('.fm-feed-nav .fm-btn')].map((b) => b.dataset.icon);
  assert.deepEqual(nav, ['up', 'down']);
  assert.ok(pipDoc.querySelector('.fm-overlay-bottom .fm-volume'), 'volume continua no canto');
  const stage = pipDoc.querySelector('.fm-stage');
  stage.dispatchEvent(new docPip.window.MouseEvent('pointerdown', { clientX: 50, clientY: 50, bubbles: true }));
  stage.dispatchEvent(new docPip.window.MouseEvent('pointerup', { clientX: 51, clientY: 50, bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(media.paused, true, 'clique no vídeo pausa');
});

test('vídeo comum não entra no modo feed', async () => {
  const page = loadPage({ url: 'https://www.youtube.com/watch?v=a', html: YT_HTML, active: true });
  fakeMedia(page.document.querySelector('video'));
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  assert.equal(docPip.window.document.body.classList.contains('fm-feed'), false);
});

test('YouTube Music: sem pausa entre faixas, a barra usa o tempo do site, não o do <video>', async () => {
  const html = YTM_MINIPLAYER.replace('0:47 / 3:12', '0:12 / 2:00') + '<video class="html5-main-video"></video>';
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html, active: true });
  // O <video> segue contando desde a música anterior (250 s de 400 s).
  const media = fakeMedia(page.document.querySelector('video'), { duration: 400, currentTime: 250 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  assert.equal(pipDoc.querySelector('.fm-bar').style.width, '10%'); // 12 s de 120 s
  pipDoc.querySelector('.fm-progress').getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 3 });
  pipDoc.querySelector('.fm-seek').dispatchEvent(new docPip.window.MouseEvent('pointerdown', { clientX: 100, bubbles: true }));
  assert.equal(media.currentTime, 298); // início da música (238 s) + metade de 120 s
});

test('YouTube Music: volume da janela segue o player, não o <video> normalizado', async () => {
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html: YTM_MINIPLAYER + '<video></video>', active: true });
  const media = fakeMedia(page.document.querySelector('video'));
  media.volume = 0.35; // normalização do YouTube: o <video> fica mais baixo
  const sent = [];
  page.document.addEventListener('floatmini:volume', (e) => sent.push(JSON.parse(e.detail)));
  // O player (yt-volume.js) informa o volume que aparece no site: 100%.
  page.document.dispatchEvent(new page.window.CustomEvent('floatmini:volume-state', { detail: JSON.stringify({ percent: 100, muted: false }) }));
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const slider = docPip.window.document.querySelector('.fm-volume input[type="range"]');
  assert.equal(slider.value, '100');
  slider.value = '40';
  slider.dispatchEvent(new docPip.window.Event('input'));
  assert.deepEqual(sent.at(-1), { volume: 0.4, muted: false });
  assert.equal(media.volume, 0.35, 'o <video> fica com o player (normalização)');
  assert.equal(slider.value, '40');
});


test('feed: auto-avançar no fim do vídeo e linha fina de progresso', async () => {
  const html = `<div id="feed"><div class="item"><video id="v1"></video></div><div class="item"><video id="v2"></video></div></div>
    <button data-e2e="arrow-down">↓</button>`;
  const page = loadPage({ url: 'https://www.tiktok.com/foryou', html, active: true, storage: { feedAutoAdvance: true } });
  const m1 = fakeMedia(page.document.getElementById('v1'), { duration: 20, currentTime: 5 });
  const m2 = fakeMedia(page.document.getElementById('v2'), { duration: 15, paused: true });
  page.document.querySelector('[data-e2e="arrow-down"]').addEventListener('click', () => {
    m1.paused = true;
    m2.paused = false;
  });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  const v1 = pipDoc.querySelector('.fm-stage video');
  v1.dispatchEvent(new page.window.Event('timeupdate'));
  assert.equal(pipDoc.querySelector('.fm-feed-line > div').style.width, '25%');
  m1.currentTime = 19.9; // fim do vídeo
  v1.dispatchEvent(new page.window.Event('timeupdate'));
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(pipDoc.querySelector('.fm-stage video').id, 'v2', 'passou sozinho para o próximo');
});

test('feed: sem auto-avançar, o vídeo que acaba continua na janela', async () => {
  const html = `<div id="feed"><div class="item"><video id="v1"></video></div><div class="item"><video id="v2"></video></div></div>`;
  const page = loadPage({ url: 'https://www.tiktok.com/foryou', html, active: true });
  const m1 = fakeMedia(page.document.getElementById('v1'), { duration: 20, currentTime: 19.9 });
  fakeMedia(page.document.getElementById('v2'), { duration: 15, paused: true });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  pipDoc.querySelector('.fm-stage video').dispatchEvent(new page.window.Event('timeupdate'));
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(pipDoc.querySelector('.fm-stage video').id, 'v1');
  assert.equal(m1.paused, false);
});

test('streaming: "Pular abertura" do site aparece na janela e clica no botão do site', async () => {
  const html = `<div class="watch-video"><video></video><button data-uia="player-skip-intro">Pular abertura</button></div>`;
  const page = loadPage({ url: 'https://www.netflix.com/watch/1', html, active: true });
  fakeMedia(page.document.querySelector('video'), { duration: 3000 });
  let clicked = 0;
  page.document.querySelector('[data-uia="player-skip-intro"]').addEventListener('click', () => clicked++);
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  await new Promise((r) => setTimeout(r, 700));
  const btn = docPip.window.document.querySelector('.fm-site-action');
  assert.equal(btn.hidden, false);
  assert.equal(btn.textContent, 'Pular abertura ›');
  btn.click();
  assert.equal(clicked, 1);
  assert.equal(btn.hidden, true);
});

test('streaming: "Próximo episódio" pelo texto, em qualquer site; anúncio do YouTube nunca', async () => {
  const html = `<div><video></video></div><div role="button" aria-label="Próximo episódio"><span>Próximo episódio</span></div>`;
  const page = loadPage({ url: 'https://globoplay.globo.com/v/1/', html, active: true });
  fakeMedia(page.document.querySelector('video'), { duration: 3000, currentTime: 2950 }); // fim do episódio
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(docPip.window.document.querySelector('.fm-site-action').textContent, 'Próximo episódio ›');

  const yt = loadPage({ url: 'https://www.youtube.com/watch?v=a', html: YT_HTML + '<button class="ytp-skip-ad-button">Pular anúncio</button><button>Pular abertura</button>', active: true });
  fakeMedia(yt.document.querySelector('video'));
  const ytPip = fakeDocumentPip(yt.window);
  assert.equal(await yt.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(ytPip.window.document.querySelector('.fm-site-action').hidden, true);
});

test('streaming: quando o site cria outro <video> para o próximo episódio, a janela acompanha', async () => {
  const page = loadPage({ url: 'https://streaming.exemplo.com/assistir/1', html: '<div id="player"><video id="ep1"></video></div>', active: true });
  const m1 = fakeMedia(page.document.getElementById('ep1'), { duration: 2400 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  // Episódio 1 termina; o site troca o player e cria o <video> do episódio 2.
  m1.paused = true;
  page.document.getElementById('player').innerHTML = '<video id="ep2"></video>';
  fakeMedia(page.document.getElementById('ep2'), { duration: 2500 });
  await new Promise((r) => setTimeout(r, 800));
  assert.equal(pipDoc.querySelector('.fm-stage video').id, 'ep2');
  assert.equal(pipDoc.querySelectorAll('.fm-stage video').length, 1);
});

test('abrir a janela conta o uso (para o pedido de avaliação)', async () => {
  const page = loadPage({ url: 'https://www.youtube.com/watch?v=a', html: YT_HTML, active: true, storage: { floatCount: 4 } });
  fakeMedia(page.document.querySelector('video'));
  fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  assert.equal(page.store.floatCount, 5);
});


test('Instagram: página inicial usa o layout de feed; perfil fica desligado', async () => {
  const home = loadPage({ url: 'https://www.instagram.com/', html: '<article><video id="a"></video></article><article><img></article><article><video id="b"></video></article>', active: true });
  const ma = fakeMedia(home.document.getElementById('a'), { duration: 30 });
  const mb = fakeMedia(home.document.getElementById('b'), { duration: 30, paused: true });
  // O Instagram dá play no vídeo que entra na tela.
  home.document.getElementById('b').scrollIntoView = () => {
    ma.paused = true;
    mb.paused = false;
  };
  const docPip = fakeDocumentPip(home.window);
  assert.equal(await home.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  assert.ok(pipDoc.body.classList.contains('fm-feed'));
  [...pipDoc.querySelectorAll('.fm-feed-nav .fm-btn')][1].click();
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(pipDoc.querySelector('.fm-stage video').id, 'b', 'pulou a foto e foi para o próximo vídeo');

  const profile = loadPage({ url: 'https://www.instagram.com/alguem/', html: '<video></video>', active: true });
  fakeMedia(profile.document.querySelector('video'));
  fakeDocumentPip(profile.window);
  assert.equal(await profile.send({ action: 'TOGGLE_FLOAT' }), 'no_media');
  assert.equal(profile.document.getElementById('floatmini-trigger-btn'), null, 'sem botão no canto');
});

test('streaming: ícone entra na barra do player, ao lado da tela cheia (sem botão no canto)', async () => {
  const html = `<div class="player"><video></video><div class="bar"><button aria-label="Volume"></button><button aria-label="Tela cheia" id="fs"></button></div></div>`;
  const page = loadPage({ url: 'https://play.hbomax.com/video/1', html });
  fakeMedia(page.document.querySelector('video'));
  await new Promise((r) => setTimeout(r, 50));
  const btn = page.document.getElementById('floatmini-native-btn');
  assert.ok(btn, 'ícone na barra');
  assert.equal(btn.nextElementSibling.id, 'fs');
  assert.equal(page.document.getElementById('floatmini-trigger-btn'), null);
});

test('TikTok/Instagram: sem botão fixo no canto (só o ícone em cima do vídeo)', async () => {
  const page = loadPage({ url: 'https://www.instagram.com/reels/abc/', html: '<video></video>' });
  fakeMedia(page.document.querySelector('video'));
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(page.document.getElementById('floatmini-trigger-btn'), null);
  assert.ok(page.document.getElementById('floatmini-video-btn'), 'ícone pronto para aparecer em cima do vídeo');
});


test('TikTok: a janela mostra um espelho do vídeo e o original fica na página', async () => {
  const html = `<div id="feed"><div class="item"><video id="v1"></video></div><div class="item"><video id="v2"></video></div></div>
    <button data-e2e="arrow-down">↓</button>`;
  const page = loadPage({ url: 'https://www.tiktok.com/foryou', html, active: true });
  const v1 = page.document.getElementById('v1');
  const v2 = page.document.getElementById('v2');
  const m1 = fakeMedia(v1, { duration: 20 });
  const m2 = fakeMedia(v2, { duration: 15, paused: true });
  v1.captureStream = () => ({ id: 'stream-1' });
  v2.captureStream = () => ({ id: 'stream-2' });
  page.document.querySelector('[data-e2e="arrow-down"]').addEventListener('click', () => {
    m1.paused = true;
    m2.paused = false;
  });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  const mirror = pipDoc.querySelector('.fm-stage video.fm-mirror');
  assert.ok(mirror, 'espelho na janela');
  assert.equal(mirror.srcObject.id, 'stream-1');
  assert.equal(mirror.muted, true, 'som continua saindo do vídeo original');
  assert.equal(v1.ownerDocument, page.document, 'o vídeo original não sai da página');

  [...pipDoc.querySelectorAll('.fm-feed-nav .fm-btn')][1].click();
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(mirror.srcObject.id, 'stream-2', 'espelho troca para o próximo vídeo');
  assert.equal(pipDoc.querySelectorAll('.fm-stage video').length, 1);
  docPip.window.close();
  assert.equal(mirror.srcObject, null);
});

test('YouTube Music: barra e clique usam o tempo da API do player', async () => {
  const html = YTM_MINIPLAYER.replace('0:47 / 3:12', '') + '<video class="html5-main-video"></video>';
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html, active: true });
  fakeMedia(page.document.querySelector('video'), { duration: 400, currentTime: 380 }); // tempo errado do <video>
  page.document.dispatchEvent(new page.window.CustomEvent('floatmini:volume-state', { detail: JSON.stringify({ percent: 50, muted: false, current: 5, total: 211 }) }));
  const seeks = [];
  page.document.addEventListener('floatmini:seek-player', (e) => seeks.push(JSON.parse(e.detail).time));
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  const width = parseFloat(pipDoc.querySelector('.fm-bar').style.width);
  assert.ok(width < 5, `barra no começo da música (${width}%)`);
  pipDoc.querySelector('.fm-progress').getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 3 });
  pipDoc.querySelector('.fm-seek').dispatchEvent(new docPip.window.MouseEvent('pointerdown', { clientX: 100, bubbles: true }));
  assert.equal(seeks.at(-1), 105.5);
});

test('YouTube Music: lê "0:05 / 3:31" de qualquer texto da barra', async () => {
  const html = '<ytmusic-player-bar><div class="ytmusicPlayerBarRight"><span class="ytmusicTime">0:05 / 3:31</span></div><div class="title">X</div></ytmusic-player-bar><video class="html5-main-video"></video>';
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html, active: true });
  fakeMedia(page.document.querySelector('video'), { duration: 400, currentTime: 380 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const width = parseFloat(docPip.window.document.querySelector('.fm-bar').style.width);
  assert.ok(Math.abs(width - (5 / 211) * 100) < 0.5, `barra pelo texto do site (${width}%)`);
});


test('Netflix: botão "Próximo episódio" da barra não aparece no começo do episódio', async () => {
  const html = `<div class="watch-video"><video></video><button data-uia="control-next" aria-label="Próximo episódio"></button></div>`;
  const page = loadPage({ url: 'https://www.netflix.com/watch/1', html, active: true });
  const media = fakeMedia(page.document.querySelector('video'), { duration: 2400, currentTime: 30 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  await new Promise((r) => setTimeout(r, 700));
  const btn = docPip.window.document.querySelector('.fm-site-action');
  assert.equal(btn.hidden, true, 'começo do episódio: nada');
  media.currentTime = 2350; // créditos
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(btn.hidden, false);
});

test('streaming: o botão da janela copia o visual do botão do site', async () => {
  const html = `<div class="watch-video"><video></video><button data-uia="player-skip-intro" style="background-color: rgb(255, 255, 255); color: rgb(0, 0, 0); border-radius: 4px">Pular abertura</button></div>`;
  const page = loadPage({ url: 'https://www.netflix.com/watch/1', html, active: true });
  fakeMedia(page.document.querySelector('video'), { duration: 2400 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  await new Promise((r) => setTimeout(r, 700));
  const btn = docPip.window.document.querySelector('.fm-site-action');
  assert.equal(btn.style.backgroundColor, 'rgb(255, 255, 255)');
  assert.equal(btn.style.color, 'rgb(0, 0, 0)');
  assert.equal(btn.style.borderRadius, '4px');
});

test('3.1: título do episódio no streaming, A−/A+ da legenda e tamanho lembrado', async () => {
  const html = `<div class="watch-video"><video></video><div data-uia="video-title"><h4>Série X</h4><span>T1:E3</span><span>A Viagem</span></div>
    <div class="player-timedtext"><div class="player-timedtext-text-container"></div></div></div>`;
  const page = loadPage({ url: 'https://www.netflix.com/watch/1', html, active: true, storage: { captionScale: { 'www.netflix.com': 1.3 }, windowSizes: { video: { width: 640, height: 360 } } } });
  fakeMedia(page.document.querySelector('video'), { duration: 2400 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  assert.equal(`${docPip.lastRequest.width}x${docPip.lastRequest.height}`, '640x360', 'abre no último tamanho');
  const pipDoc = docPip.window.document;
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(pipDoc.querySelector('.fm-title').textContent, 'Série X · T1:E3 · A Viagem');
  assert.equal(pipDoc.body.style.getPropertyValue('--fm-cap'), '1.3');
  page.document.querySelector('.player-timedtext-text-container').textContent = 'Oi';
  await new Promise((r) => setTimeout(r, 300));
  assert.ok(pipDoc.body.classList.contains('fm-has-cc'));
  [...pipDoc.querySelectorAll('.fm-cc')].find((b) => b.title === 'Legenda maior').click();
  assert.equal(page.store.captionScale['www.netflix.com'], 1.45);
});


test('feed: dois cliques no vídeo curtem pelo botão do site (sem descurtir)', async () => {
  const html = `<div class="reel"><div><video></video></div><button aria-label="Curtir"><svg aria-label="Curtir"></svg></button></div>`;
  const page = loadPage({ url: 'https://www.instagram.com/reels/abc/', html, active: true });
  const media = fakeMedia(page.document.querySelector('video'), { duration: 20 });
  let likes = 0;
  page.document.querySelector('button[aria-label="Curtir"]').addEventListener('click', () => likes++);
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  const stage = pipDoc.querySelector('.fm-stage');
  const tap = () => {
    stage.dispatchEvent(new docPip.window.MouseEvent('pointerdown', { clientX: 50, clientY: 50, bubbles: true }));
    stage.dispatchEvent(new docPip.window.MouseEvent('pointerup', { clientX: 50, clientY: 50, bubbles: true }));
  };
  tap();
  tap();
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(likes, 1);
  assert.equal(media.paused, false, 'dois cliques não pausam');
  assert.ok(pipDoc.querySelector('.fm-heart'));

  // Já curtido: não clica (não descurte).
  page.document.querySelector('button').setAttribute('aria-label', 'Descurtir');
  page.document.querySelector('svg').setAttribute('aria-label', 'Descurtir');
  tap();
  tap();
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(likes, 1);
});

test('YouTube Music: "A seguir" com a próxima música nos últimos segundos', async () => {
  const queue = `<ytmusic-player-queue-item selected><div class="song-title">Agora</div><div class="byline">Banda A</div></ytmusic-player-queue-item>
    <ytmusic-player-queue-item><div class="song-title">Próxima Música</div><div class="byline">Banda B</div></ytmusic-player-queue-item>`;
  const page = loadPage({ url: 'https://music.youtube.com/watch?v=a', html: YTM_MINIPLAYER.replace('0:47 / 3:12', '') + queue + '<video></video>', active: true });
  const media = fakeMedia(page.document.querySelector('video'), { duration: 200, currentTime: 50 });
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  assert.equal(pipDoc.querySelector('.fm-upnext').textContent, '');
  media.currentTime = 190;
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal(pipDoc.querySelector('.fm-upnext').textContent, 'A seguir: Próxima Música · Banda B');
});

test('SoundCloud: mini player com os botões do site', async () => {
  const html = `<div class="playControls"><button class="skipControl__previous"></button><button class="playControls__play playing"></button><button class="skipControl__next"></button>
    <button class="shuffleControl m-shuffling"></button><button class="repeatControl m-one"></button>
    <div class="playbackTimeline__timePassed"><span aria-hidden="true">1:00</span></div><div class="playbackTimeline__duration"><span aria-hidden="true">4:00</span></div>
    <a class="playbackSoundBadge__titleLink" title="Faixa SC">Faixa SC</a><a class="playbackSoundBadge__lightLink" title="Artista SC">Artista SC</a></div>`;
  const page = loadPage({ url: 'https://soundcloud.com/discover', html, active: true });
  let nexts = 0;
  page.document.querySelector('.skipControl__next').addEventListener('click', () => nexts++);
  const docPip = fakeDocumentPip(page.window);
  assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
  const pipDoc = docPip.window.document;
  assert.equal(pipDoc.querySelector('.fm-track').textContent, 'Faixa SC');
  assert.equal(pipDoc.querySelector('.fm-artist').textContent, 'Artista SC');
  assert.equal(pipDoc.querySelector('.fm-bar').style.width, '25%');
  assert.equal(pipDoc.querySelector('.fm-primary').dataset.icon, 'pause');
  [...pipDoc.querySelectorAll('.fm-btn')].find((b) => b.title === 'Próxima').click();
  assert.equal(nexts, 1);
  assert.equal(pipDoc.querySelector('[data-mode]').dataset.mode, 'one');
});


test('janela em inglês e espanhol conforme o idioma do navegador', async () => {
  for (const [lang, next] of [['en-US', 'Forward 10 seconds (→)'], ['es-419', 'Adelante 10 segundos (→)']]) {
    const page = loadPage({ url: 'https://www.youtube.com/watch?v=a', html: YT_HTML, active: true, lang });
    fakeMedia(page.document.querySelector('video'));
    const docPip = fakeDocumentPip(page.window);
    assert.equal(await page.send({ action: 'TOGGLE_FLOAT' }), 'opened');
    const titles = [...docPip.window.document.querySelectorAll('.fm-btn')].map((b) => b.title);
    assert.ok(titles.includes(next), `${lang}: ${titles.join(' | ')}`);
  }
});
