# Firefox Add-ons (addons.mozilla.org) — textos da publicação

Painel: https://addons.mozilla.org/developers/ → **Submit a New Add-on**.

---

## 1. Como enviar

1. Gere o pacote: `npm run zip:firefox` → `dist-extension/floatmini-firefox-<versão>.zip`.
2. **Where to host:** *On this site* (listado no addons.mozilla.org).
3. **Upload** do zip.
4. **Platforms / compatibility:** marque só **Firefox (desktop)**. Desmarque **Firefox for Android**: a janela flutuante (Document Picture-in-Picture) só existe no desktop.
5. **Source code:** responda **No**. O código enviado é o próprio código-fonte (sem minificação, bundler ou transpilação).

O manifest do Firefox é gerado automaticamente a partir de `extension/manifest.json`:
- id `floatmini@jorgelana` (não mude depois de publicar, é a identidade da extensão)
- Firefox **151 ou mais novo** (primeira versão com Document Picture-in-Picture)
- `data_collection_permissions: none` (a extensão não coleta dados)

---

## 2. Describe Add-on

**Name**
```
FloatMini - Janela Flutuante Always-on-Top
```

**Add-on URL**
```
floatmini
```

**Summary** (até 250 caracteres)
```
Deixe o YouTube e o YouTube Music numa mini janela flutuante sempre por cima de tudo, com controles de reprodução, aleatório/repetir e volume. Sem anúncios e sem coleta de dados.
```

**Description**: use o mesmo texto em português do `store/LISTING.md`, trocando a linha de requisito por:
```
Requer Firefox 151 ou mais novo (desktop).
```

**Categories**
- Photos, Music & Videos
- Tabs

**Tags** (opcional): `youtube`, `youtube music`, `picture in picture`, `always on top`, `floating window`

**Support email:** seu e-mail
**Support website:** `https://github.com/Jorge-Lana/floatmini-extension/issues`

**License:** GNU General Public License v3.0

**Privacy policy:** marque *This add-on has a privacy policy* e cole o texto do `PRIVACY.md` (o AMO pede o texto, não um link).

---

## 3. Notes to Reviewer

```
FloatMini opens the media playing in the current tab in an always-on-top window using the Document Picture-in-Picture API (Firefox 151+, desktop).

How to test:
1. Open any YouTube video (youtube.com/watch?v=...).
2. Click the FloatMini icon in the YouTube player control bar (next to the subtitles button), or press Alt+P with the page focused. The video opens in a floating window with playback and volume controls.
3. Open music.youtube.com, play a song and press Alt+P (or click the FloatMini icon in the player bar, next to the like button). A compact mini player opens with artwork, shuffle/repeat and volume.
4. The browser only allows the floating window right after a click or key press on the page. When triggered from the toolbar popup or the context menu, a blue "click here" button appears on the page to provide that user gesture.

No account or login is required. The extension collects no data and makes no network requests.
The submitted files are the original, unminified source code: https://github.com/Jorge-Lana/floatmini-extension
```

---

## 4. Depois de aprovado

O link fica em `https://addons.mozilla.org/firefox/addon/floatmini/`.
