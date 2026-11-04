# Bugs encontrados

Lista dos bugs relatados. As correções entram no PR "Correções de bugs" e saem juntas na próxima versão.

| # | Status | Onde | Bug | Versão |
|---|--------|------|-----|--------|
| 1 | Corrigido neste PR | YouTube Music | Ao terminar uma música, a barra de progresso não reinicia e continua como se fosse a anterior. Causa: com reprodução sem pausa entre faixas, o `<video>` continua contando o tempo da música anterior. Agora a barra usa o tempo do próprio site, e o clique na barra conta a partir do início da música atual. ![print](img/bugs/ytmusic-barra-2026-11-04.png) | 2.0.1 (a correção da 2.0.1 não bastou) |

## Como relatar

- Site (ex.: YouTube Music, Globoplay, TikTok)
- Navegador e versão do FloatMini (`chrome://extensions` ou `about:addons`)
- O que aconteceu e o que era esperado
- Print da janela flutuante; se for legenda ou botão do site, print do **Inspecionar** no elemento
