# Bugs encontrados

Lista dos bugs relatados. As correções entram no PR "Correções de bugs" e saem juntas na próxima versão.

| # | Status | Onde | Bug | Versão |
|---|--------|------|-----|--------|
| 1 | Corrigido na 3.0 | YouTube Music | O controle de volume da janela parece não subir (fica baixo mesmo com o volume alto). Causa: a normalização de volume do YouTube deixa o `<video>` mais baixo que o volume do site, e a janela lia o `<video>`. Agora a janela segue o volume do player (o mesmo do site). ![print](img/bugs/ytmusic-volume-2026-11-04.png) | 2.0.1 |
| 2 | Corrigido na 3.1.0 — confirmar | YouTube Music | Quando a música acaba e passa para a próxima, a barra de progresso não volta ao começo. Causa provável: com reprodução sem pausa entre faixas, o `<video>` continua contando o tempo da música anterior. Na 3.0.1 a barra passou a ler o tempo mostrado pelo site, mas não achava o texto no layout atual. Agora o tempo vem da API do próprio player (o mesmo de "0:05 / 3:31" da barra), e o clique na barra também usa a API. ![print 3.0.1](img/bugs/ytmusic-barra-3.0.1-2026-11-06.png) ![print](img/bugs/ytmusic-barra-troca-faixa-2026-11-04.png) | 2.0.1, 3.0.1 |
| 3 | Corrigido na 3.0.1 | Instagram (e TikTok) | O botão "🗗 Flutuar" no canto da tela fica em cima da barra "Mensagens" do Instagram. Agora, no Instagram e no TikTok, o ícone aparece no canto do vídeo ao passar o mouse, sem botão fixo na tela. O ícone no canto do vídeo é o picture-in-picture do próprio Firefox, não da extensão. ![print](img/bugs/instagram-botao-flutuar-2026-11-04.png) | 3.0.0 |
| 4 | Corrigido na 3.0.1 | Instagram | Aberto pela página inicial ou pelo perfil, o reel vinha com a janela de vídeo comum (linha do tempo, ±10 s). Agora a página inicial usa o layout de feed (setas ▲ ▼ vão para o próximo vídeo, pulando fotos) e no perfil a extensão fica desligada. ![print](img/bugs/instagram-home-perfil-2026-11-04.png) | 3.0.0 |
| 5 | Corrigido na 3.0.1 | Streamings (ex.: Max) | O botão "🗗 Flutuar" no canto ficava em cima da barra do player. Agora o ícone entra na barra do player, ao lado da tela cheia, como no YouTube; com a opção "Streamings, TikTok e Instagram" ativada no menu ele aparece sozinho. ![print](img/bugs/streaming-botao-flutuar-2026-11-04.png) | 3.0.0 |
| 6 | Removido na 3.0.1 | Menu da extensão | "Flutuar mídia desta aba" e "Abrir um link numa janela compacta" eram confusos (pediam um clique extra na página). Saíram do menu; continuam o ícone na barra, Alt+P, Alt+Shift+P e o botão direito. | 3.0.0 |
| 7 | Corrigido na 3.0.1 — confirmar | TikTok | A janela flutuante fica preta (o vídeo continua na página). Causa provável: o player do TikTok reinicia o `<video>` quando ele sai da página. Agora, no TikTok, a janela mostra um espelho do vídeo (`captureStream`) e o original fica no lugar; se o navegador não deixar espelhar, volta ao jeito antigo. O botão "Flutuar" em cima da barra do TikTok já saiu na 3.0.1. ![print](img/bugs/tiktok-janela-preta-2026-11-05.png) | 2.0.1 |
| 8 | Corrigido na 3.1.0 — confirmar | Netflix | "Próximo episódio ›" aparecia na janela logo no começo do episódio. Causa: a barra do player da Netflix tem um botão "Próximo episódio" o tempo todo. Agora, quando o botão é achado pelo texto, ele só aparece nos últimos 2 minutos. Também: o botão da janela passa a copiar o visual do botão do site (cor, borda, cantos). ![print](img/bugs/netflix-proximo-episodio-2026-11-06.png) | 3.0.1 |

## Como relatar

- Site (ex.: YouTube Music, Globoplay, TikTok)
- Navegador e versão do FloatMini (`chrome://extensions` ou `about:addons`)
- O que aconteceu e o que era esperado
- Print da janela flutuante; se for legenda ou botão do site, print do **Inspecionar** no elemento
