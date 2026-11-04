# Bugs encontrados

Lista dos bugs relatados. As correções entram no PR "Correções de bugs" e saem juntas na próxima versão.

| # | Status | Onde | Bug | Versão |
|---|--------|------|-----|--------|
| 1 | Corrigido na 3.0 | YouTube Music | O controle de volume da janela parece não subir (fica baixo mesmo com o volume alto). Causa: a normalização de volume do YouTube deixa o `<video>` mais baixo que o volume do site, e a janela lia o `<video>`. Agora a janela segue o volume do player (o mesmo do site). ![print](img/bugs/ytmusic-volume-2026-11-04.png) | 2.0.1 |
| 2 | Corrigido na 3.0 | YouTube Music | Quando a música acaba e passa para a próxima, a barra de progresso não volta ao começo. Causa provável: com reprodução sem pausa entre faixas, o `<video>` continua contando o tempo da música anterior. Agora a barra usa o tempo mostrado pelo site. ![print](img/bugs/ytmusic-barra-troca-faixa-2026-11-04.png) | 2.0.1 |
| 3 | Aberto | Instagram (e TikTok) | O botão "🗗 Flutuar" no canto da tela fica em cima da barra "Mensagens" do Instagram. Ideia: nos sites de feed, mudar o botão de lugar ou escondê-lo (o Alt+P já funciona). O ícone no canto do vídeo é o picture-in-picture do próprio Firefox, não da extensão. ![print](img/bugs/instagram-botao-flutuar-2026-11-04.png) | 3.0.0 |

## Como relatar

- Site (ex.: YouTube Music, Globoplay, TikTok)
- Navegador e versão do FloatMini (`chrome://extensions` ou `about:addons`)
- O que aconteceu e o que era esperado
- Print da janela flutuante; se for legenda ou botão do site, print do **Inspecionar** no elemento
