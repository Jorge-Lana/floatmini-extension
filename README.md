# FloatMini

[![Buy me a coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=jorgelana&button_colour=5F7FFF&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00)](https://buymeacoffee.com/jorgelana)

Mini janela flutuante **sempre no topo** para YouTube, YouTube Music, Spotify Web e vídeos da web.

O repositório tem duas partes:

| Pasta | O que é |
|-------|---------|
| [`extension/`](extension/) | A extensão do navegador (Manifest V3). É o produto: pode ser carregada direto em `chrome://extensions`. |
| [`src/`](src/) | O site em React: simulador da janela flutuante, guia de instalação, visualizador do código e botão que gera o `.zip` da extensão. |

O site importa os arquivos de `extension/` como texto (`?raw`), então existe uma única fonte do código da extensão.

## Testar a extensão localmente

1. Abra `chrome://extensions` (ou `edge://extensions`, `brave://extensions`).
2. Ative o **Modo de desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta `extension/`.
4. Abra um vídeo no YouTube e aperte `Alt + P`.

Depois de editar algum arquivo, clique em ↻ no card da extensão e recarregue a aba.

Detalhes de uso, atalhos e permissões: [`extension/README.md`](extension/README.md).

## Comandos

Requer Node 20+ (ou Bun). Tanto `npm install` quanto `bun install` funcionam.

```bash
npm install
npm run dev        # site em http://localhost:3000
npm run build      # build do site em dist/
npm run lint       # TypeScript + verificação da extensão
npm test           # testes do content script (DOM simulado com jsdom)
npm run check:ext  # só a verificação da extensão
npm run zip:ext    # gera os pacotes para Chrome e Firefox em dist-extension/
npm run zip:chrome # só o pacote da Chrome Web Store
npm run zip:firefox # só o pacote do Firefox (addons.mozilla.org)
npm run version:set -- 1.3.4  # muda a versão no manifest e no package.json
```

Novas versões são publicadas nas lojas pelo GitHub Actions quando a versão do `manifest.json` muda na `main`. Passo a passo em [docs/RELEASE.md](docs/RELEASE.md).

`check:ext` (em `scripts/check-extension.mjs`) pega os erros que fazem a extensão quebrar no navegador sem aviso: arquivo referenciado que não existe, `<script>` ou `onclick` inline (bloqueados pelo CSP do Manifest V3), API do Chrome usada sem a permissão no manifest e erro de sintaxe.

## Como funciona o "sempre no topo"

A extensão usa a API **Document Picture-in-Picture** (Chrome 116+ e Firefox 151+), que abre uma janela do sistema operacional que fica por cima de qualquer programa. O vídeo da página é movido para essa janela e devolvido ao lugar original quando ela fecha.

O navegador só permite abrir essa janela logo após um clique ou tecla **dentro da página**. Por isso `Alt + P` é tratado pelo próprio content script, e os pedidos vindos do popup ou do menu de contexto mostram um botão na página pedindo um clique.

---

## ☕ Apoie o projeto

O FloatMini é gratuito e mantido no tempo livre. Se ele te ajuda, considere [pagar um café](https://buymeacoffee.com/jorgelana).

[![Buy me a coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=jorgelana&button_colour=5F7FFF&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00)](https://buymeacoffee.com/jorgelana)

---

## 🔒 Privacidade

O FloatMini não coleta nem envia nenhum dado. Detalhes em [PRIVACY.md](PRIVACY.md).

## 📄 Licença

[GPL-3.0](LICENSE). Você pode usar, estudar, modificar e redistribuir o FloatMini, desde que versões modificadas também sejam distribuídas com o código aberto sob a mesma licença.
