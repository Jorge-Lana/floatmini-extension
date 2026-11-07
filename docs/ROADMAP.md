# Roadmap — FloatMini 3.0 e 3.1

![Como ficaria a 3.0](img/floatmini-3.0-como-ficaria.png)

Na imagem, o que é novo está com contorno amarelo tracejado.

## 3.0 — lançado

**Correções de bugs** — lista em [`BUGS.md`](BUGS.md).

**Shorts, TikTok e Reels**
1. **Auto-avançar** — opção no menu: quando o vídeo acaba, a janela vai sozinha para o próximo.
2. **Alt+P e ícone no TikTok/Instagram** — botão no menu que pede a permissão só para quem quiser (`optional_host_permissions`), sem desativar a extensão de todo mundo numa atualização.
3. **Barrinha de progresso fina** — linha fina embaixo, sem números, só para ver quanto falta.

**Streaming**
4. **Pular abertura / recapitulação / créditos** — quando o site mostra o botão, ele aparece também na janela flutuante.
5. **Próximo episódio** — botão na janela quando o site oferece o próximo episódio; a janela acompanha o novo episódio.

**Extensão**
6. **Atalho em qualquer site** — atalho global Alt+Shift+P (Netflix, Globoplay, qualquer site), sem permissão nova.
7. **Pedir avaliação** — depois de alguns usos, aparece no menu um "Gostou? Avalie na loja", discreto e uma vez só (loja certa: Chrome ou Firefox).

## 3.1 — lançado

1. **Inglês e espanhol** — menu, janela flutuante e páginas das lojas traduzidos (`_locales`).
2. **"A seguir" no fim da música** — nos últimos segundos da faixa, o mini player mostra a próxima música da fila.
3. **Tamanho da legenda** — A− / A+ na janela, lembrado por site.
4. **Título do episódio** — nome do episódio discreto em cima ao mexer o mouse.
5. **Lembrar tamanho e lugar da janela** — separado para vídeo, música e vídeo curto.
6. **Mini player para mais sites de música** — SoundCloud e Deezer.
7. **Curtir com duplo clique** no feed — por último: mexe na conta e os sites mudam com frequência.
8. **Avançar/voltar por site** — conferir em cada streaming (Max, Globoplay, Disney+, Prime) se mudar o tempo direto funciona ou se precisa da API do player, como na Netflix. *(Ainda depende de teste em cada site; a Netflix já usa a API do player.)*

## Projeto (sugestões, a decidir)

1. **Atualizar as Actions** para `@v5` (aviso de Node 20 obsoleto) — edição manual nos workflows. *(O Dependabot já vai abrir PRs para isso.)*
2. ~~Dependabot~~ — feito na 3.1 (`.github/dependabot.yml`).
3. ~~Formulário de bug e link "Relatar problema"~~ — feito na 3.1.
4. **Página no GitHub Pages** com links das lojas e política de privacidade.
5. **Página da Chrome Web Store em inglês** (texto pronto em `store/LISTING.md`).
