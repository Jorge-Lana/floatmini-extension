# Roteiro de testes

Fluxo a partir da 4.0: cada versão sai **primeiro no Firefox**. Depois de
testar com este roteiro, o Chrome é enviado à mão (Actions → Chrome → Run
workflow, com a versão).

Marque o que passou; o que falhar vira um item em [BUGS.md](BUGS.md) (com print).

## 1. Miniplayer de música (YouTube Music e Spotify)
- [ ] Abrir pelo ícone na barra do player: janela abre alta (320×380) com capa, barra, tempos, nome e artista.
- [ ] Passar o mouse na capa: aparecem volume, aleatório, anterior, play, próxima, repetir.
- [ ] Pausar pelo site: os controles ficam visíveis na capa sem precisar do mouse.
- [ ] Play/pausa, próxima, anterior, aleatório e repetir (3 estados) funcionam e o ícone acompanha.
- [ ] Clicar e arrastar na barra muda o tempo da música.
- [ ] Música acaba e vai para a próxima: barra e tempos voltam para 0:00 (bug antigo do YT Music).
- [ ] Últimos 15 s: aparece "A seguir: …" no lugar do artista.
- [ ] Encolher a altura abaixo de ~200 px: vira a faixa compacta (capa, nome, play redondo, próxima).
- [ ] Encolher muito: a janela volta sozinha para o mínimo (260×88). Se não voltar, sobram play e próxima centralizados.
- [ ] Fechar e abrir de novo: abre no último tamanho usado.

## 2. Volume (o bug antigo)
- [ ] Mexer no volume da janela: bolinha e preenchimento sempre no mesmo lugar.
- [ ] Depois de mexer na janela, trocar de música: o volume continua o da janela.
- [ ] Mexer no volume do site com a janela aberta: a janela acompanha (bolinha e preenchimento).
- [ ] Setas ↑ ↓ e M dentro da janela mudam o volume / mudo.
- [ ] Fechar a janela: o volume do site fica livre (mexer no site não volta sozinho).

## 3. Vídeo (YouTube e streamings)
- [ ] YouTube: ícone na barra do player abre a janela; o ícone fica azul enquanto aberta.
- [ ] Barra de tempo, ±10 s, velocidade, volume e legenda funcionam.
- [ ] Legenda só aparece com o CC do YouTube ligado.
- [ ] Encolher muito: volta para o mínimo (240×135).
- [ ] Netflix/Prime/Disney+/Globoplay: ícone ao lado da tela cheia; legenda na janela; "Pular abertura" e "Próximo episódio" só no fim.
- [ ] Pausar na janela com outra prévia tocando na página: a janela NÃO troca de vídeo.

## 4. Vídeos curtos (Shorts, TikTok, Reels)
- [ ] Ícone em cima do vídeo abre a janela em pé.
- [ ] Setas laterais, roda do mouse e ↑ ↓ passam de vídeo; volume no canto.
- [ ] Clique pausa, duplo clique curte.
- [ ] "Passar sozinho quando o vídeo acaba" (menu) funciona.
- [ ] Perfil do Instagram: sem ícone.

## 5. Geral
- [ ] Menu da extensão: controles rápidos, tamanho, "Mais sites".
- [ ] Alt+Shift+P e botão direito → abrir janela.
- [ ] Navegador em inglês/espanhol: textos traduzidos.
- [ ] Aba em segundo plano por um tempo e voltar: ícone continua no lugar.
