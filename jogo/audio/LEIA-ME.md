# Som

Tudo aqui é opcional. Arquivo que não existir é ignorado, sem erro no console
e sem travar nada. Dá para entregar um som por vez.

## Formato: use OGG ou MP3, não WAV

Os nomes no código vão **sem extensão**. O jogo pergunta ao navegador o que ele
sabe tocar e procura nesta ordem: **`.ogg` → `.mp3` → `.wav`**.

Então `audio/trilha1.ogg` é encontrado sozinho, sem mexer em nada. Se só
existir o `.wav`, ele também funciona — mas 3 minutos em WAV são uns 30 MB
contra 3 MB em OGG, e para o jogo no site do MME isso é a diferença entre
carregar e não carregar numa conexão de escola.

Recomendação: componha em WAV, **publique em OGG** (o Audacity exporta direto).
MP3 fica como alternativa para navegador antigo.

## O botão SOM tem três estados

`Mudo` → `Efeitos` → `Som` (efeitos + trilha) → `Mudo`…

**Começa tocando.** A escolha de quem já mexeu no botão fica guardada, então
quem desligou uma vez não é surpreendido na partida seguinte.

O estado do meio existe para a feira: quem está demonstrando às vezes quer o
retorno sonoro das jogadas sem a música competindo com a própria voz.

### Sobre "tocar sozinho"

Navegador nenhum deixa tocar áudio antes de um gesto do usuário — é regra da
plataforma, não escolha do jogo. O que dá para fazer, e é o que está feito:
tenta tocar assim que a página abre; se for barrado, **engata no primeiro
clique ou tecla** que acontecer. Como a primeira coisa que a pessoa faz é
clicar em alguma coisa, na prática a música começa sozinha.

---

## Trilha

| Arquivo | Volume |
|---|---|
| `audio/trilha1.ogg` | 0,40 |
| `audio/trilha2.ogg` | 0,40 |
| `audio/trilha3.ogg` | 0,40 |

Tocam em revezamento: acabou uma, entra a próxima, em laço. Para mudar a
quantidade ou os nomes, é a constante `TRILHAS` no mesa.js — uma linha.

---

## Efeitos

Os oito que você pediu:

| Arquivo | Quando toca | Volume |
|---|---|---|
| `audio/turno` | encerrar o turno | 0,55 |
| `audio/extrair` | jogar carta da mão no campo | 0,60 |
| `audio/refinar` | subir o degrau do refino | 0,60 |
| `audio/forjar` | forjar liga | 0,70 |
| `audio/ataque-carta` | atacar uma ficha inimiga | 0,60 |
| `audio/ataque-escudo` | atacar o escudo direto | 0,70 |
| `audio/fim` | fim de partida (o mesmo para os dois) | 0,75 |
| `audio/tempo` | dispara **uma vez**, quando faltam 10 s | 0,50 |

E os seis que faltavam na sua lista:

| Arquivo | Quando toca | Por que vale ter | Volume |
|---|---|---|---|
| `audio/comprar` | carta nova chega ao virar o turno | fecha o ciclo do turno; discreto | 0,35 |
| `audio/esgotou` | ficha morre no combate | perder peça é evento e merece marca própria | 0,55 |
| `audio/liga-pronta` | o botão de forjar acabou de acender | **é o que ensina a escada** | 0,45 |
| `audio/especulacao` | mão cheia: a carta se perde e custa escudo | punição silenciosa ninguém entende | 0,55 |
| `audio/exaustao` | jazida vazia corroendo o escudo | idem: dano que vem "do nada" precisa de aviso | 0,60 |
| `audio/nao` | jogada recusada | evita a sensação de clique no vazio | 0,40 |

Desses, o mais importante é o **`liga-pronta`**. É o único som do jogo que
não descreve o que já aconteceu: ele avisa que apareceu uma possibilidade. Num
estande, onde ninguém leu regra nenhuma, é o que faz a pessoa descobrir sozinha
que existe um degrau acima.

---

## Notas de produção

**Duração.** Efeito de jogada entre 150 e 400 ms. Acima disso ele ainda está
tocando quando a próxima jogada acontece e a mesa vira sopa. Exceções: o fim de
partida pode ter 1 a 2 s, e o `tempo` é o único longo — você falou em 10
segundos exatos, e é assim que está: dispara uma vez quando o relógio marca 10
e acompanha a contagem até o fim. Se preferir um tique por segundo, é uma linha
no HTML.

**Sobreposição.** Cada efeito tem três instâncias em rodízio, então dois sons
iguais em sequência rápida não se cortam.

**Volume.** Os valores da tabela são relativos e já pensados para o conjunto:
ataque ao escudo mais alto que ataque a carta, compra bem baixinho. Se um som
seu vier alto na mixagem, prefira abaixar no arquivo em vez de mexer aqui, para
a mistura continuar previsível.

**Um som só para os dois jogadores no fim** — como você pediu, e faz sentido num
material institucional: ninguém é humilhado na frente da turma. Se um dia quiser
separar, é acrescentar `fim-vitoria` e `fim-derrota` mais uma condição.

---

## Atualização de 10/08/2026 — sorteio e quantidade

O jogo procura `audio/trilha1` a **`audio/trilha5`**. O que não existir é
descartado sem erro, então dá para ter duas hoje e cinco em dezembro sem
tocar em código nenhum.

**A primeira faixa da partida é sorteada**, e a partir dela segue em fila.
Assim duas partidas seguidas não abrem com a mesma música, e também não fica
repetindo a mesma por azar de sorteio.

## O botão SOM agora DESCE

`Som` (efeitos + trilha) → `Efeitos` → `Mudo` → `Som`…

Era ao contrário, e subia: de `Som` o primeiro clique ia direto para `Mudo`.
Quem só queria abaixar a música se via sem som nenhum. **Começa em `Som`.**

---

## A tela inicial (`inicio.html`)

| Arquivo | O quê | Volume |
|---|---|---|
| `audio/inicio` | **uma** trilha só, em laço, para a tela de entrada | 0,28 |
| `audio/ui-clique` | clique em qualquer botão da entrada | 0,45 |
| `audio/ui-passa` | mouse passando por cima de um cartão | 0,22 |

**A trilha da entrada é mais calma e mais baixa que as do jogo** (0,28
contra 0,40): ela toca enquanto a pessoa lê e escolhe, não enquanto joga.
É uma só, e em laço — quem fica na tela inicial fica pouco tempo.

O `ui-passa` é o mais delicado do conjunto: dispara a cada cartão que o
mouse toca, então precisa ser curtíssimo (60 a 120 ms) e quase inaudível.
Se ele chamar atenção, vira irritação em dez segundos.

**O botão de som da entrada e o do jogo guardam a escolha na mesma chave**
(`minerais.som`). Quem silencia na entrada entra no jogo silenciado, e
vice-versa — duas chaves fariam a pessoa desligar o som duas vezes.
