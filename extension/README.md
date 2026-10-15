# FloatMini - Extensão de Janela Flutuante Always-on-Top

Extensão de navegador (Manifest V3) que coloca o vídeo do **YouTube**, a música do **YouTube Music** ou do **Spotify Web** numa janela compacta que fica **sempre por cima** dos outros programas, usando a API Document Picture-in-Picture do Chrome.

Requer Chrome, Edge, Brave ou Opera 116+, ou **Firefox 151+** (desktop).

---

## 🚀 Como instalar

> **Firefox:** instale pelo addons.mozilla.org. Para testar sem publicar, abra `about:debugging#/runtime/this-firefox`, clique em **Carregar extensão temporária** e escolha o `manifest.json` de dentro do zip `floatmini-firefox-<versão>.zip` descompactado.

1. **Descompacte** o `.zip` numa pasta fixa (por exemplo, `Documentos/FloatMini`). Se você clonou o repositório, use a pasta `extension/`.
2. **Abra a página de extensões:**
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
   - Opera: `opera://extensions`
3. **Ative o "Modo de desenvolvedor"** no canto superior direito.
4. Clique em **"Carregar sem compactação"** (Load unpacked) e selecione a pasta.

---

## ▶️ Como usar

- Na página do vídeo ou da música, aperte **`Alt + P`** ou clique no ícone de janela flutuante. No YouTube e no YouTube Music ele fica na barra de controles do player, junto das outras opções (fica azul enquanto a janela está aberta); no Spotify e em outros sites, é o botão **🗗 Flutuar** no canto da tela. A janela abre na hora.
- Para fechar, aperte `Alt + P` de novo ou feche a janela flutuante. O vídeo volta para o lugar dele na página.
- Também dá para usar o botão do popup ou o menu do botão direito ("Abrir na janela flutuante"). Nesses casos aparece um botão azul na página pedindo **um clique**: o navegador só deixa abrir janelas flutuantes logo após um clique ou tecla *dentro* da página.
- A janela flutuante pode ser redimensionada arrastando a borda.

### O que aparece na janela

| Site | Conteúdo |
|------|----------|
| YouTube e outros sites com vídeo | O próprio vídeo, com ⏪ 10s, Play/Pausar, 10s ⏩, velocidade (1x a 2x) e volume (mudo + controle deslizante). Teclas: espaço, ← →, ↑ ↓ (volume) e M (mudo). |
| YouTube Music | Mini player ("tela menor") com capa, faixa, artista, barra de progresso, volume, aleatório, anterior, play, próxima e repetir. Teclas: ↑ ↓ (volume) e M (mudo). |
| Spotify Web | Mesmo mini player, controlando os botões do próprio Spotify. |

Os botões de aleatório e repetir acionam os do próprio site e mostram o estado atual: ficam **azuis** quando ligados, e o ícone de repetir muda para 🔂 (com "1") quando está repetindo só a música atual. A ordem é desligado → repetir todas → repetir só esta.

---

## ⚡ Atalhos

- **`Alt + P`**: abre/fecha a janela flutuante (funciona com o foco na página).
- Um atalho global pode ser configurado em `chrome://extensions/shortcuts` ("Abrir/fechar a janela flutuante"). Ele pede um clique na página antes de abrir, pelo motivo explicado acima.

---

## 🔒 Permissões

| Permissão | Para quê |
|-----------|----------|
| Acesso a youtube.com, music.youtube.com e open.spotify.com | Mostrar o botão Flutuar e o atalho Alt+P nesses sites. |
| `activeTab` + `scripting` | Em qualquer outro site, carregar a extensão só na aba atual e só quando você usa o popup, o menu ou um atalho. |
| `contextMenus` | Item "Abrir na janela flutuante" no botão direito. |
| `storage` | Guardar suas preferências (tamanho da janela). |

## Limitações conhecidas

- O "Abrir um link numa janela compacta" do popup abre o site numa janela pequena do navegador. Essa janela **não** fica sempre no topo; para isso, clique no botão azul que aparece nela.
- Páginas internas do navegador (`chrome://`, loja de extensões) não aceitam extensões.
- Vídeos dentro de iframes de outro domínio (por exemplo, um vídeo do YouTube incorporado num blog) não são detectados pelo botão Flutuar; abra o vídeo no próprio YouTube.

---

## ☕ Apoie o projeto

O FloatMini é gratuito e mantido no tempo livre. Se ele te ajuda, considere [pagar um café](https://buymeacoffee.com/jorgelana).

[![Buy me a coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=jorgelana&button_colour=5F7FFF&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00)](https://buymeacoffee.com/jorgelana)
