# Chrome Web Store — textos da publicação

Copie cada bloco para o campo correspondente no [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## Pacote

Gere o `.zip` com `npm run zip:ext` (sai em `dist-extension/floatmini-extension-<versão>.zip`) e envie em **Package → Upload new package**.

---

## Store listing

**Category:** Productivity (Produtividade) · Workflow & planning
**Language:** Portuguese (Brazil). Adicione English em *Store listing → Add language* com os textos em inglês abaixo.

### Descrição curta (até 132 caracteres) — vem do `manifest.json`

> Mini janela flutuante sempre no topo para YouTube, YouTube Music, Spotify e vídeos da web.

Não liste muitas marcas na descrição: a Chrome Web Store rejeitou a 1.4.3 por "spam de palavra-chave" com "YouTube, YouTube Music, Spotify, Netflix, Prime Video, Disney+".

### Descrição — Português (Brasil)

```
Cansado de trocar de aba só para pausar uma música ou acompanhar um vídeo enquanto trabalha?

O FloatMini coloca seus vídeos e músicas numa mini janela flutuante que fica SEMPRE POR CIMA de tudo: editor de código, planilha, reunião, jogo, o que estiver na sua tela.

▶ YOUTUBE
• O próprio vídeo numa janela flutuante, redimensionável
• Linha do tempo para ir a qualquer ponto do vídeo
• Voltar/avançar 10 segundos, play/pausa e velocidade (1x a 2x)
• Legendas aparecem na janela flutuante
• Volume com botão de mudo
• Teclado: espaço, ← →, ↑ ↓ e M

♫ YOUTUBE MUSIC E SPOTIFY
• Mini player compacto com capa, faixa, artista e progresso
• Clique na barra de progresso para mudar o tempo da música
• Anterior, play/pausa, próxima, aleatório e repetir (todas / só esta)
• Os botões mostram o estado atual, igual ao player do site
• Volume com botão de mudo

🎬 SITES DE STREAMING E OUTROS VÍDEOS
• O vídeo em janela flutuante com linha do tempo, ±10 s, velocidade e volume
• As legendas do site vão junto para a janela
• Abra pelo botão da extensão ou pelo menu do botão direito

📱 YOUTUBE SHORTS, TIKTOK E REELS DO INSTAGRAM
• Janela em pé, do tamanho certo para vídeos verticais
• Botões ▲ ▼ (ou Page Up / Page Down) para passar de vídeo sem sair da janela

⚡ RÁPIDO DE USAR
• Ícone integrado na barra do próprio player do YouTube e do YouTube Music
• Atalho Alt + P no YouTube, YouTube Music e Spotify
• Também pelo botão da extensão ou pelo menu do botão direito
• Ao fechar a janela, o vídeo volta para a página exatamente onde estava

🔒 PRIVACIDADE
• Não coleta nenhum dado, não tem anúncios nem rastreadores
• Funciona 100% no seu navegador
• Código aberto (GPL-3.0): github.com/Jorge-Lana/floatmini-extension

Requer Chrome 116 ou mais novo (também funciona no Edge, Brave e Opera).

Gostou? Apoie o projeto: buymeacoffee.com/jorgelana
```

### Description — English

```
Tired of switching tabs just to pause a song or keep an eye on a video while you work?

FloatMini puts your videos and music in a small floating window that stays ALWAYS ON TOP of everything: your code editor, spreadsheets, meetings, games — whatever is on your screen.

▶ YOUTUBE
• The video itself in a resizable floating window
• Timeline to jump to any point of the video
• Back/forward 10 seconds, play/pause and speed (1x to 2x)
• Subtitles show up in the floating window
• Volume with mute button
• Keyboard: space, ← →, ↑ ↓ and M

♫ YOUTUBE MUSIC AND SPOTIFY
• Compact mini player with artwork, track, artist and progress
• Click the progress bar to change the song position
• Previous, play/pause, next, shuffle and repeat (all / one)
• Buttons show the current state, just like the site's player
• Volume with mute button

🎬 STREAMING SITES AND OTHER VIDEOS
• The video in a floating window with timeline, ±10 s, speed and volume
• The site's subtitles come along to the window
• Open it from the extension button or the right-click menu

📱 YOUTUBE SHORTS, TIKTOK AND INSTAGRAM REELS
• Portrait window sized for vertical videos
• ▲ ▼ buttons (or Page Up / Page Down) to swipe to the next video without leaving the window

⚡ QUICK TO USE
• Icon built into the YouTube and YouTube Music player bar
• Alt + P shortcut on YouTube, YouTube Music and Spotify
• Also from the extension button or the right-click menu
• When you close the window, the video goes back to the page exactly where it was

🔒 PRIVACY
• Collects no data, no ads, no trackers
• Runs 100% in your browser
• Open source (GPL-3.0): github.com/Jorge-Lana/floatmini-extension

Requires Chrome 116 or newer (also works on Edge, Brave and Opera).

Enjoying it? Support the project: buymeacoffee.com/jorgelana
```

### Imagens

| Campo | Arquivo | Tamanho |
|-------|---------|---------|
| Store icon | `extension/icons/icon128.png` | 128×128 |
| Small promo tile | `store/promo-small-440x280.png` | 440×280 |
| Marquee promo tile (opcional) | `store/promo-marquee-1400x560.png` | 1400×560 |
| Screenshots (1 a 5) | `store/screenshots/floatmini-*.png` | 1280×800 |

**Screenshots sugeridos** (janela do Chrome em 1280×800, ou recorte para esse tamanho):
1. Vídeo do YouTube flutuando por cima de outro programa (editor de código ou planilha).
2. Mini player do YouTube Music com capa, aleatório/repetir azuis e volume.
3. Barra do player do YouTube com o ícone do FloatMini e a dica "Janela flutuante sempre no topo (Alt+P)".
4. Popup da extensão aberto.

Use páginas e playlists neutras (sem nomes pessoais) nas capturas.

### Links

- **Homepage URL:** https://github.com/Jorge-Lana/floatmini-extension
- **Support URL:** https://github.com/Jorge-Lana/floatmini-extension/issues

---

## Privacy practices

### Single purpose

```
FloatMini shows the media playing in the current tab (YouTube videos, the YouTube Music player and other web videos) in a floating, always-on-top mini window with playback controls.
```

### Permission justifications

**activeTab**
```
Used only when the user clicks the extension button, the context-menu item or the extension shortcut, so the extension can find the video in the current tab and open it in the floating window. No access to other tabs.
```

**scripting**
```
Injects the extension's own content script (content.js, bundled in the package) into the current tab on sites other than YouTube, YouTube Music and Spotify, only after a user action granted through activeTab. No remote code is executed.
```

**contextMenus**
```
Adds the "Abrir na janela flutuante" (Open in floating window) item to the right-click menu.
```

**storage**
```
Saves the user's floating-window size preference locally (chrome.storage.local). Nothing is synced or sent anywhere.
```

**Host permissions (youtube.com, music.youtube.com, open.spotify.com)**
```
The content script runs on these sites to add the floating-window button to the site's player bar, handle the Alt+P shortcut, read the title/artist/artwork of the media that is playing and trigger the site's own player controls (play, next, shuffle, repeat, volume) from the floating window. All processing happens locally; no page data is collected or transmitted.
```

### Remote code

**No, I am not using remote code.**

### Data usage

Não marque nenhuma categoria (a extensão não coleta dados). Marque as três declarações:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy URL

```
https://github.com/Jorge-Lana/floatmini-extension/blob/main/PRIVACY.md
```

---

## Distribution

- **Visibility:** Public
- **Regions:** All regions
- **Pricing:** Free
