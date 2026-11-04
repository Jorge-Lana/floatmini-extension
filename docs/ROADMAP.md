# Roadmap — FloatMini 3.0 ("mega atualização")

Ideias guardadas para a 3.0. Nada disto está implementado ainda.

![Como ficaria a 3.0](img/floatmini-3.0-como-ficaria.png)

Na imagem, o que é novo está com contorno amarelo tracejado. O "Auto-avançar" pode ficar na janela ou só no menu da extensão (a decidir).

## Shorts, TikTok e Reels (decidido)

1. **Auto-avançar** — opção no menu: quando o vídeo acaba, a janela vai sozinha para o próximo.
2. **Alt+P e ícone no TikTok/Instagram** — botão "Ativar no TikTok/Instagram" no menu que pede a permissão só para quem quiser (`optional_host_permissions`), sem desativar a extensão de todo mundo numa atualização.
3. **Barrinha de progresso fina** — linha de 2 px embaixo, sem números, só para ver quanto falta.
4. **Lembrar tamanho/posição da janela em pé** — separado do tamanho da janela de vídeo normal.
5. **Curtir com duplo clique** — clica no "curtir" do site. Por último: mexe na conta e os sites mudam com frequência.

## Streaming (decidido)

1. **Pular abertura / recapitulação / créditos** — quando o site mostra o botão, ele aparece também na janela flutuante (opção: pular sozinho).
2. **Próximo episódio** — botão na janela quando o site oferece o próximo episódio.
3. **Tamanho da legenda** — A− / A+ na janela, lembrado por site.
4. **Título do episódio** — nome do episódio aparece discreto em cima ao mexer o mouse.
5. **Avançar/voltar por site** — conferir em cada streaming (Max, Globoplay, Disney+, Prime) se mudar o tempo direto funciona ou se precisa da API do player, como na Netflix.

## Extensão (decidido)

1. **Atalho em qualquer site** — atalho global (ex.: Alt+Shift+P) que abre a janela na Netflix, Globoplay ou qualquer site, sem permissão nova.
2. **Inglês e espanhol** — menu, janela flutuante e páginas das lojas traduzidos (`_locales`).
3. **Lembrar tamanho e lugar da janela** — separado para vídeo, música e vídeo curto.
4. **Mini player para mais sites de música** — SoundCloud e Deezer, com capa e controles como no YouTube Music.
5. **"A seguir" no fim da música** — nos últimos segundos da faixa, aparece no mini player uma linha discreta com a próxima música da fila.

## Projeto (decidido)

1. **Pedir avaliação** — depois de algumas vezes usando a janela flutuante, aparece no menu um "Gostou? Avalie na loja", discreto e uma vez só (link da loja certa: Chrome ou Firefox).

## Projeto (sugestões, a decidir)

1. **Atualizar as Actions** para `@v5` (aviso de Node 20 obsoleto) — edição manual nos workflows.
2. **Dependabot** para npm e GitHub Actions.
3. **Formulário de bug** (issue template) e link "Relatar problema" no menu da extensão.
4. **Página no GitHub Pages** com links das lojas e política de privacidade.
5. **Página da Chrome Web Store em inglês** (texto pronto em `store/LISTING.md`).

## Correções de bugs

Os bugs relatados ficam em [`BUGS.md`](BUGS.md) e as correções no PR "Correções de bugs (acumulado)". Entram todas na 3.0.
