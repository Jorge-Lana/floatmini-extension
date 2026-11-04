# Bugs encontrados

Lista dos bugs relatados. As correções entram no PR "Correções de bugs" e saem juntas na próxima versão.

| # | Status | Onde | Bug | Versão |
|---|--------|------|-----|--------|
| 1 | Corrigido neste PR | YouTube Music | O controle de volume da janela parece não subir (fica baixo mesmo com o volume alto). Causa: a normalização de volume do YouTube deixa o `<video>` mais baixo que o volume do site, e a janela lia o `<video>`. Agora a janela segue o volume do player (o mesmo do site). ![print](img/bugs/ytmusic-volume-2026-11-04.png) | 2.0.1 |
| 2 | Melhoria neste PR | YouTube Music | Barra de progresso passa a usar o tempo mostrado pelo site; com reprodução sem pausa entre faixas o `<video>` pode continuar contando o tempo da música anterior. | 2.0.1 |

## Como relatar

- Site (ex.: YouTube Music, Globoplay, TikTok)
- Navegador e versão do FloatMini (`chrome://extensions` ou `about:addons`)
- O que aconteceu e o que era esperado
- Print da janela flutuante; se for legenda ou botão do site, print do **Inspecionar** no elemento
