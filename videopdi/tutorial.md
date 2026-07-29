# Vídeo — Cadeia de Terras Raras (Remotion)

Vídeo didático de ~6min30, 1920×1080, 30 fps, montado em código.
Cada bloco do roteiro é uma cena; a narração entra por baixo e as
imagens de fundo ficam atrás do texto animado.

---

## 1. Rodar pela primeira vez

Precisa de Node.js 20 ou superior. Dentro da pasta do projeto:

```bash
npm install
npm run dev
```

Abre o Remotion Studio no navegador. Na barra lateral aparecem sete
composições: `Video` (o filme inteiro) e uma por cena, para você
iterar sem esperar o vídeo todo carregar.

**Ele já roda sem nenhum áudio e sem nenhuma imagem.** As cenas usam
uma duração de ensaio e um fundo sólido. É de propósito: você monta o
vídeo primeiro e vai substituindo os placeholders depois.

---

## 2. Colocar a narração

Gere um MP3 **por cena** (não um só para o vídeo inteiro) e salve em:

```
public/audio/cena1.mp3   ← Bloco 0 · abertura
public/audio/cena2.mp3   ← Bloco 1 · ecossistema
public/audio/cena3.mp3   ← Bloco 3 · MAGBRAS
public/audio/cena4.mp3   ← Bloco 4 · REGINA II
public/audio/cena5.mp3   ← Bloco 5 · estratégia
public/audio/cena6.mp3   ← Bloco 6 · fechamento
```

O texto de cada uma está em `src/roteiro.ts`, no campo `narracao` —
é de lá que você copia para o gerador de voz.

**A duração da cena passa a ser a duração do MP3, automaticamente.**
Você não precisa ajustar nenhum número de tempo total: o projeto mede
o áudio e se estica sozinho. Trocou a locução por uma versão 4
segundos mais longa? Só recarregar.

Um arquivo por cena é o que torna isso confortável — quando você
regravar só o bloco do MAGBRAS, nada mais no vídeo se desloca.

---

## 3. Colocar as imagens de fundo

Salve em `public/fundos/` com estes nomes (1920×1080 ou maior):

| Arquivo | Cena | Sugestão de imagem |
|---|---|---|
| `01-mina.jpg` | 1 | mina a céu aberto, minério |
| `02-cadeia.jpg` | 1 | planta industrial, tubulação |
| `03-ima.jpg` | 1 | ímã, motor elétrico, rotor |
| `04-laboratorio.jpg` | 2 | laboratório, bancada, pesquisa |
| `05-industria.jpg` | 2 | linha de produção |
| `06-lagoa-santa.jpg` | 3 | galpão industrial, Minas Gerais |
| `07-mover.jpg` | 3 | autopeça, montagem automotiva |
| `08-atores.jpg` | 3 | textura neutra, escura |
| `09-pesquisa.jpg` | 4 | microscópio, amostras |
| `10-estrategia.jpg` | 5 | textura neutra, escura |
| `11-mapa.jpg` | 5 | paisagem de MG ou GO |
| `12-fechamento.jpg` | 6 | fábrica em operação, aérea |

Nome diferente, imagem a mais, imagem a menos: tudo se controla em
`src/roteiro.ts`, no campo `fundos` de cada cena.

```ts
fundos: [
  { arquivo: "fundos/01-mina.jpg", de: 0, zoom: "aproxima", escurecer: 0.62 },
  //                               ↑ segundo em que entra
]
```

- `zoom`: `"aproxima"`, `"afasta"` ou `"parado"` — movimento lento de
  câmera sobre a foto parada.
- `escurecer`: 0 a 1. **Se o texto estiver difícil de ler, suba esse
  número.** É o ajuste que você mais vai usar.

Escolha imagens com áreas calmas à direita: o texto mora na esquerda.

---

## 4. Ajustar a sincronia com a narração

Em `src/roteiro.ts`, cada cena tem um bloco `marcas`. Cada número é o
**segundo, contado do início da cena, em que aquele elemento entra**.

```ts
marcas: {
  local: 1,        // "Em Lagoa Santa, Minas Gerais..."
  numeros: 7,      // "vinte e oito indústrias, cem toneladas..."
  cicloCompleto: 15,
  ...
}
```

### A régua de sincronia

Dentro do Remotion Studio aparece um painel no canto superior direito
com o segundo atual em números grandes e a lista de marcas da cena,
marcando quais já dispararam. Ele existe só para esse ajuste e **nunca
sai no MP4** — some sozinho durante o render.

O ciclo é:

1. Abra a composição da cena isolada (`Cena-3-magbras`, por exemplo).
2. Toque com a barra de espaço e pare na palavra que interessa.
   As setas ← → andam quadro a quadro para afinar.
3. Leia o número grande no painel.
4. Escreva esse número na marca correspondente em `src/roteiro.ts`.
5. Salve. O Studio recarrega sozinho e você confere.

### Entre 0,3 s antes da palavra

A animação de entrada leva cerca de 0,6 s para completar. Se você
marcar o segundo exato em que a palavra é dita, o elemento ainda está
subindo quando a narração já passou — e lê como atraso.

Marque **0,3 s antes**. O elemento termina de entrar bem em cima da
palavra. Se a locutora diz "vinte e oito indústrias" aos 7,2 s, use
`numeros: 6.9`.

### Ler a onda do áudio

A linha do tempo do Studio desenha a forma de onda da narração. Os
vales entre as frases são visíveis, então dá para posicionar as marcas
nas pausas sem precisar ouvir tudo várias vezes — útil para uma
primeira passada rápida antes do ajuste fino.

---

## 5. Renderizar

```bash
npm run render          # MP4 final em saida/terras-raras.mp4
npm run render-rapido   # metade da resolução, para revisão interna
```

Na primeira vez o Remotion baixa um Chrome próprio (~150 MB). Depois
disso funciona offline. Uma cena isolada:

```bash
npx remotion render Cena-3-magbras saida/magbras.mp4
```

---

## 6. Gerar a locução

Qualquer TTS serve — o projeto só precisa dos MP3. Duas observações
que economizam retrabalho:

- **Siglas.** MAGBRAS, CETEM, FIEMG, IPT, ICT são lidas de forma
  imprevisível por sintetizadores. Ouça antes de aceitar. Se sair
  errado, escreva foneticamente só no texto que vai para o TTS
  (`MAG-BRÁS`), mantendo a grafia correta no vídeo.
- **Números.** O roteiro já está com "vinte e oito" e "cem toneladas"
  por extenso, que é como o TTS acerta. Na tela aparecem como 28 e
  100 t, que é como o olho lê melhor. Os dois estão certos, cada um
  no seu canal.

---

## 7. Legendas

Ligue em `src/roteiro.ts`: `LEGENDAS_LIGADAS = true`.

São **aproximadas** — as frases se distribuem pela cena de acordo com
o tamanho, sem alinhamento real com a voz. Servem para revisão
interna. Para legenda de exibição, o caminho correto é transcrever os
MP3 (Whisper) e gerar um `.srt` para acompanhar o vídeo, em vez de
queimar na imagem — assim ela pode ser desligada por quem assiste.

---

## 8. Estrutura dos arquivos

```
src/
  roteiro.ts        ← texto, áudio, imagens e sincronia (edite aqui)
  theme.ts          ← cores e tipografia
  Video.tsx         ← encadeia as cenas e mede os áudios
  Root.tsx          ← registra as composições
  cenas/            ← uma por bloco do roteiro
  componentes/      ← peças reutilizadas
public/
  audio/            ← narração
  fundos/           ← imagens
```

---

## 9. Licença do Remotion

O Remotion é gratuito para indivíduos, organizações sem fins
lucrativos e empresas com até três pessoas; empresas maiores precisam
de licença paga. Um órgão público não é organização com fins
lucrativos, então o uso gratuito se aplica — mas, como é material
institucional, vale confirmar com o jurídico antes da publicação.
Termos: https://github.com/remotion-dev/remotion/blob/main/LICENSE.md

---

## 10. O que este projeto não faz

- **Não tem 3D.** Se quiser as linhas de campo magnético ou o cristal
  girando, renderize no Blender como sequência PNG com alfa e
  encaixe como mais uma camada de fundo.
- **Não tem trilha sonora.** Adicione uma faixa em `public/audio/` e
  monte um `<Audio>` de fundo no `Video.tsx`, com volume baixo.
- **Não tem vinheta institucional.** Se o ministério tiver uma, ela
  entra antes da cena 1 como um vídeo.
