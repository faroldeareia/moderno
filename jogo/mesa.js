/* VERSÃO DA MESA: v10 (2026-08-06)
   motor: engine.js · dados: dados.js (gerado da planilha)
   Aqui NÃO há regra de jogo. Este arquivo
   desenha o estado, escuta clique e arrasto, e chama Motor.aplicar.
   Se alguma regra aparecer aqui, ela vai divergir do servidor. */
'use strict';

const VERSAO = 'v10';

const T = {
  geo:'Geopolítica', geoLonga:'força geopolítica',
  reservas:'Reservas', energia:'Energia', valor:'Valor', dureza:'Dureza',
  jogadores:['Jogador 1','Jogador 2'],
  papeis:['Geólogo de Minas','Explorador do Quadrilátero']
};
const SEG_TURNO = 90;

/* AS CINCO FAMÍLIAS.
   As cores moram no topo do estilo.css, em --b1 a --b5. São classes comumente usadas pelo MME */

const COR = {
  'Segurança Alimentar':  {c:'var(--b1)', s:'var(--b1s)', nome:'Segurança alimentar',  chave:'SEGURANÇA ALIMENTAR'},
  'Transição Energética': {c:'var(--b2)', s:'var(--b2s)', nome:'Transição energética', chave:'TRANSIÇÃO ENERGÉTICA'},
  'Construção Civil':     {c:'var(--b3)', s:'var(--b3s)', nome:'Construção civil',     chave:'CONSTRUÇÃO CIVIL'},
  'Alta Tecnologia':      {c:'var(--b4)', s:'var(--b4s)', nome:'Alta tecnologia',      chave:'ALTA TECNOLOGIA'},
  'Segurança Energética': {c:'var(--b5)', s:'var(--b5s)', nome:'Segurança energética', chave:'SEGURANÇA ENERGÉTICA'}
};
/* Se um bloco novo aparecer no dados.js sem cor aqui, ele cai na Transição, mas o console avisa, para o erro não passar despercebido de novo. */
const CORPADRAO = COR['Transição Energética'];

/* ============================================================
   SLOTS DE ARTE 
   ------------------------------------------------------------ */
const NN = id => String(id).padStart(2,'0');

/* QUALQUER FORMATO, EM TODO LUGAR.
 **webp primeiro**, porque é o
   menor; depois jpg; png por último. O primeiro que carregar vence. */
const FORMATOS_IMG = ['.webp', '.jpg', '.png'];
const comFormatos = base => FORMATOS_IMG.map(e => base + e);
const slug = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function caminhosArte(c, b, forma){
  const fichaP = forma === 'ficha';
  if(c.liga){
    const g = 'ligas/' + slug(c.liga);
    return fichaP ? comFormatos(g + '-ficha').concat(comFormatos(g))
                  : comFormatos(g);
  }
  if(!b || !b.id) return [];
  const n = NN(b.id), refinada = (c.nivel || 0) >= 1;
  let lista = [];
  if(refinada){
    if(fichaP) lista = lista.concat(comFormatos('arte/' + n + '-refinado-ficha'));
    lista = lista.concat(comFormatos('arte/' + n + '-refinado'));
  }
  if(fichaP) lista = lista.concat(comFormatos('arte/' + n + '-ficha'));
  return lista.concat(comFormatos('arte/' + n));
}

/* Tenta a lista em ordem e entrega a primeira que carregar. */
function carregarArte(lista, aoAchar){
  let i = 0;
  (function tentar(){
    if(i >= lista.length) return;
    const url = lista[i++];
    const img = new Image();
    img.alt = '';
    img.onload = () => aoAchar(img);
    img.onerror = tentar;
    img.src = url;
  })();
}

/* Sobra de compatibilidade: nada mais chama. Fica porque é uma linha, e
   quem chamar de fora ganha um caminho válido — mas o certo é
   `caminhosArte`, que tenta os três formatos. */
const ARTE = id => 'arte/' + NN(id) + '.jpg';
/* Tenta uma LISTA e usa a primeira que carregar. É o `seExistir` para
   quando o mesmo arquivo pode estar em vários formatos. */
function seExistirUm(lista, aoCarregar){
  let i = 0;
  (function tentar(){
    if(i >= lista.length) return;
    const url = lista[i++];
    const im = new Image();
    im.onload  = () => aoCarregar(url);
    im.onerror = tentar;
    im.src = url;
  })();
}
function seExistir(url, aoCarregar){
  const i = new Image(); i.onload = () => aoCarregar(url); i.src = url;
}
const raiz = document.documentElement;
/* CENÁRIO SORTEADO — como nomear os arquivos:

       mesa/fundo1.   mesa/fundo2.  …   até mesa/fundo8

   Ele testa todos, fica com os que carregarem de verdade e sorteia um por
   partida. 
   O sorteio usa Math.random e NÃO a semente: cenário não é regra de jogo, e
   ver outra paisagem na segunda partida é bom, não é inconsistência. (O
   avatar é o contrário, sendo que ele usa a semente, porque precisa bater com o
   replay guardado.) */
(function cenarioSorteado(){
  const nomes = ['mesa/fundo'];
  for(let i = 1; i <= 8; i++) nomes.push('mesa/fundo' + i);
  const urls = [];
  nomes.forEach(n => urls.push.apply(urls, comFormatos(n)));

  const achados = [];
  let faltam = urls.length;
  const decidir = () => {
    if(--faltam > 0) return;
    if(!achados.length) return;
    achados.sort();                       // ordem estável, sorteio depois
    const u = achados[Math.floor(Math.random() * achados.length)];
    raiz.style.setProperty('--cenario', 'url("' + u + '")');
  };
  urls.forEach(url => {
    const im = new Image();
    im.onload  = () => { achados.push(url); decidir(); };
    im.onerror = decidir;
    im.src = url;
  });
})();
seExistirUm(comFormatos('mesa/mesa'), u => { raiz.style.setProperty('--tampo','url(' + u + ')');
                                   document.getElementById('arena').classList.add('transp'); });
seExistirUm(comFormatos('mesa/verso'), u => raiz.style.setProperty('--verso','url(' + u + ')'));

/* Acentos: camada de EXIBIÇÃO. A correção de verdade é acentuar a planilha. */
const ACENTOS = {
  minerio:'minério', minerios:'minérios', potassio:'potássio', molibdenio:'molibdênio',
  litio:'lítio', niobio:'nióbio', niquel:'níquel', silicio:'silício', tantalo:'tântalo',
  titanio:'titânio', tungstenio:'tungstênio', uranio:'urânio', vanadio:'vanádio',
  aluminio:'alumínio', manganes:'manganês', espodumenio:'espodumênio',
  niquelifera:'niquelífera', vanadifera:'vanadífera', ionica:'iônica', ionico:'iônico',
  aco:'aço', acos:'aços', acido:'ácido', inoxidavel:'inoxidável', rapido:'rápido',
  ferrossilicio:'ferrossilício', ferrovanadio:'ferrovanádio', galvanizacao:'galvanização',
  latao:'latão', duraluminio:'duralumínio', metalico:'metálico', ima:'ímã',
  neodimio:'neodímio', ion:'íon', anodo:'ânodo', oxidos:'óxidos',
  industria:'indústria', resistencia:'resistência', simbolo:'símbolo', nao:'não',
  propria:'própria', limonitica:'limonítica', canhao:'canhão', estrategica:'estratégica',
  resolucao:'resolução', incluida:'incluída', sulfurico:'sulfúrico', fosfatica:'fosfática',
  formula:'fórmula', caetite:'Caetité', maracas:'Maracás', goias:'Goiás',
  aeronautica:'aeronáutica', apos:'após', carbotermica:'carbotérmica', catodica:'catódica',
  catodo:'cátodo', celula:'célula', conexao:'conexão', coracao:'coração', corroi:'corrói',
  eletrica:'elétrica', eletrico:'elétrico', eletronica:'eletrônica', energetica:'eletrônica',
  eolico:'eólico', gas:'gás', ha:'há', hidraulica:'hidráulica', mantem:'mantém',
  protecao:'proteção', proxima:'próxima', reducao:'redução', restricao:'restrição',
  seguranca:'segurança', siderurgico:'siderúrgico', so:'só', tres:'três',
  transicao:'transição', vergalhao:'vergalhão'
};
const RE_ACENTO = new RegExp('\\b(' + Object.keys(ACENTOS).join('|') + ')\\b','gi');
function acentuar(s){
  if(!s) return '';
  return String(s).replace(RE_ACENTO, m => {
    const a = ACENTOS[m.toLowerCase()];
    return m[0] === m[0].toUpperCase() ? a[0].toUpperCase() + a.slice(1) : a;
  });
}
function curto(nome){
  const s = acentuar(nome).replace(/^Min[ée]rios? do grupo da /i,'').replace(/^Min[ée]rios? de /i,'');
  return s[0].toUpperCase() + s.slice(1);
}
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const SIGLA = {'Pt, Pd':'PGM'};
const NIVEIS = ['concentrado','refinado','liga'];
const nomeNivel = c => NIVEIS[c.nivel || 0] || 'concentrado';

/* ------------------------------------------------------------
   OS TRÊS NOMES DA CARTA — a tese do jogo dita pela própria carta.

   Cada carta do dados.js tem  nome / minerio / refinado , e a liga
   tem o dela em  ligas[].refinado . A carta mostra o nome do degrau
   em que ela está AGORA
   ------------------------------------------------------------ */
function nomeDegrau(c, b){
  if(c.liga){
    const lg = DADOS.ligas.find(l => l.nome === c.liga);
    return acentuar((lg && lg.refinado) || c.liga);
  }
  if((c.nivel || 0) >= 1) return acentuar((b && b.refinado) || curto(c.nome));
  return acentuar((b && b.minerio) || curto(c.nome));
}
/* Ligas de que esta carta pode participar. É pista, não regra: a pessoa
   descobre que existe um degrau acima sem ninguém explicar. */
function ligasDaCarta(b){
  if(!b || !b.nome) return [];
  return DADOS.ligas.filter(l => l.cartas.indexOf(b.nome) >= 0).map(l => l.nome);
}

/* ============================================================
   OS TRÊS SELOS DA CARTA — e por que os três precisam de símbolo */
const selo = (tipo, ico, n) =>
  '<span class="badge ' + tipo + '"><span>' + n + '</span></span>';
const hexEnergia = n =>
  '<span class="badge ene"><span class="marca"><svg class="ic"><use href="#i-energia"/></svg></span>' +
  '<span>' + n + '</span></span>';

/* Tira do texto da carta o que é registro administrativo e não conteúdo de
   jogo. O dado continua intocado em dados.js e reaparece no rodapé da carta
   grande, numa palavra só. */
function semJargao(t){
  return String(t || '')
    .replace(/N[aã]o consta na Resolu[cç][aã]o[^.]*\.\s*/gi, '')
    .replace(/Inclu[ií]da para viabilizar[^.]*\.\s*/gi, '')
    .replace(/Bloco duplo\.\s*/gi, '')
    .trim();
}

/* ============================================================
   DICAS — pousar o mouse (ou dar Tab) explica cada peça.
   ============================================================ */
const DICAS = {
  escudoEu: ['Seu escudo', 'A ' + T.geoLonga + ': o quanto você aguenta apanhar. Chegou a zero, você perde.'],
  escudoOp: ['Força do adversário', 'Zerar isto é a condição de vitória. Arraste uma carta sua até aqui, ou a selecione e clique aqui.'],
  reservas: ['Reservas', 'Representa seu saldo de cartas, o que há para lavrar. Quando acaba, a exaustão passa a retirar sua força, cada turno um pouco mais forte.'],
  exaustao: ['A jazida acabou', 'Não há mais o que lavrar. A cada turno a exaustão tira força, e o golpe cresce: 1, depois 2, depois 3. O número mostrado é o do próximo. Ela come primeiro as suas barreiras, e só depois o escudo.'],
  energia:  ['Energia', 'Paga extração, refino e forja. Sobe 1 por turno até 9 e NÃO acumula entre os turnos.'],
  maoOp:    ['Mão do adversário', 'Quantas cartas o seu adversário tem.'],
  relogio:  ['Tempo do turno', 'Tempo máximo para realizar as jogadas.'],
  encerrar: ['Encerra o turno', 'Passa a vez. A energia que sobrou se perde e suas cartas acordam para o próximo turno.'],
  forjar:   ['Forjar liga', 'Junta duas cartas refinadas numa só, e ela entra com +4 de força e +4 de dureza, SEM custo de energia. Abra para ver quais estão ao alcance e o que falta para cada uma.'],
  refinar:  ['Refinar / P&D', ': 3 de custo +1 de força e +2 de dureza, e vira barreira (alvo obrigatório). P&D o custo é fixo, e pode ser feita na mão.'],
  registro: ['Registro', 'Tudo que aconteceu. O botão guarda um arquivo com a semente e as jogadas.'],
  avatar:   ['Adversário', 'O seu adversário.'],
  degrau:   ['Degrau da cadeia', 'Concentrado é o que se exporta cru e vale pouco. Refinado vale mais. Liga é o topo, neste jogo.'],
  barreira: ['Barreira', 'Toda carta REFINADA trava a passagem. Enquanto uma delas estiver no campo, só ela pode ser atacada.'],
  /* Era 'Dureza Mohs'. A barra sempre desenhou a defesa de jogo, não a
     dureza física — o rótulo é que estava mentindo. Hoje dureza significa
     importância geopolítica da substância. */
  dureza:   ['Dureza', 'A importância geopolítica da substância. No jogo é a resistência: quanto ela aguenta antes de sair do campo.'],
  degrauNome:['O nome muda', 'A mesma substância tem um nome em cada degrau: como sai do chão, como sai da refinaria, e como vira liga.'],
  som:      ['Trilha sonora', 'Música de fundo do jogo.']
};
let dicaTimer = null;
function montarDicas(){
  const achar = e => e.target && e.target.closest && e.target.closest('[data-dica]');
  document.addEventListener('pointerover', e => { const a = achar(e); if(a) mostrarDica(a); });
  document.addEventListener('pointerout',  e => { if(achar(e)) esconderDica(); });
  document.addEventListener('focusin',     e => { const a = achar(e); if(a) mostrarDica(a); });
  document.addEventListener('focusout', esconderDica);
  addEventListener('scroll', esconderDica, true);
}
function mostrarDica(alvo){
  if(document.body.classList.contains('arrastandoAlgo')) return;
  const d = DICAS[alvo.dataset.dica];
  if(!d) return;
  clearTimeout(dicaTimer);
  dicaTimer = setTimeout(() => {
    const cx = $('dica');
    cx.innerHTML = '<b>' + esc(d[0]) + '</b>' + esc(d[1]);
    cx.style.left = '-9999px'; cx.style.top = '0px';
    const c = cx.getBoundingClientRect();          // mede JÁ com o texto dentro
    const r = alvo.getBoundingClientRect();
    let x = Math.min(Math.max(10, r.left + r.width / 2 - c.width / 2), innerWidth - c.width - 10);
    let y = r.bottom + 10;
    if(y + c.height > innerHeight - 10) y = Math.max(10, r.top - c.height - 10);
    cx.style.left = x + 'px'; cx.style.top = y + 'px';
    cx.classList.add('on');
  }, 240);
}
function esconderDica(){ clearTimeout(dicaTimer); $('dica').classList.remove('on'); }

/* ============================================================
   TRILHA SONORA — arquivos em  audio/  (ver audio/LEIA-ME.md).
 O jogo pergunta ao navegador o que ele
   sabe tocar e procura nessa ordem: .ogg, .mp3, .wav.
   ------------------------------------------------------------ */
const FORMATOS = ['.ogg', '.mp3', '.wav'];
/* Quantas trilhas procurar. O que não existir é descartado sozinho (fica
   `quebrada`), então dá para deixar sobrando: hoje há duas, e o dia em que
   a trilha5.ogg aparecer na pasta ela entra sem tocar em código. */
const TRILHAS = Array.from({length:12}, (_,i) => 'audio/trilha' + (i+1));
const VOLUME_TRILHA = 0.30;

const SONS = {
passarTurno:   ['audio/turno',         0.797],
jogarCarta:    ['audio/extrair',       0.823],
refinar:       ['audio/refinar',       0.823],
forjarLiga:    ['audio/forjar',        0.874],
atacarCarta:   ['audio/ataque-carta',  0.823],
atacarHeroi:   ['audio/ataque-escudo', 0.874],
fimPartida:    ['audio/fim',            0.900],
tempoAcabando: ['audio/tempo',          0.771],
comprarCarta:  ['audio/comprar',        0.694],
cartaEsgotada: ['audio/esgotou',        0.797],
ligaDisponivel:['audio/liga-pronta',    0.746],
especulacao:   ['audio/especulacao',    0.797],
exaustao:      ['audio/exaustao',       0.823],
jogadaInvalida:['audio/nao',            0.720],
barreira:      ['audio/barreira',       0.797]
};

/* Escolhe o formato pelo que o navegador declara saber tocar, e cai para
   o próximo se o arquivo não existir. */
function fonteDe(base){
  const a = document.createElement('audio');
  for(const ext of FORMATOS){
    const tipo = ext === '.ogg' ? 'audio/ogg' : ext === '.mp3' ? 'audio/mpeg' : 'audio/wav';
    if(a.canPlayType(tipo)) return base + ext;
  }
  return base + '.wav';
}
function novoAudio(base, vol){
  const a = new Audio();
  a.volume = vol;
  let i = 0;
  const tentar = () => {
    if(i >= FORMATOS.length){ a.quebrada = true; return; }
    a.src = base + FORMATOS[i++];
  };
  a.addEventListener('error', tentar);
  tentar();
  return a;
}

/* Três degraus: 0 mudo · 1 só efeitos · 2 efeitos + trilha.
   COMEÇA LIGADO. */
/* atual:-1 = "ainda não tocou nada", que é o sinal para SORTEAR a primeira. */
const som = { nivel:2, faixas:[], atual:-1, efeitos:{}, destravado:false, esperandoGesto:false };
const VOZES = 3;

function prepararSom(){
  TRILHAS.forEach(base => {
    const a = novoAudio(base, VOLUME_TRILHA);
    /* preload NONE, não 'auto'. Com 'auto' o navegador baixava AS OITO
       trilhas ao abrir a página: muito peso antes da primeira jogada, contra
       pouco de todo o resto do jogo somado. 
       Só toca uma por vez, então só se baixa a que vai tocar. */
    a.preload = 'none';
    a.addEventListener('ended', () => { if(som.nivel === 2) proximaFaixa(); });
    som.faixas.push(a);
  });
  Object.keys(SONS).forEach(nome => {
    const [base, vol] = SONS[nome];
    som.efeitos[nome] = { i:0, vozes: Array.from({length:VOZES}, () => novoAudio(base, vol)) };
  });
}

/* Navegador nenhum deixa tocar áudio antes de um gesto do usuário */
function destravarNoPrimeiroGesto(){
  if(som.destravado || som.esperandoGesto) return;
  som.esperandoGesto = true;
  const engatar = () => {
    som.esperandoGesto = false;
    removeEventListener('pointerdown', engatar);
    removeEventListener('keydown', engatar);
    if(som.destravado) return;         // já estava tocando: não empilha
    som.destravado = true;
    if(som.nivel === 2) proximaFaixa();
  };
  addEventListener('pointerdown', engatar, {once:true});
  addEventListener('keydown', engatar, {once:true});
}
function iniciarSom(){
  pintarSom();
  if(som.nivel === 2) proximaFaixa();
  destravarNoPrimeiroGesto();
}

function tocar(nome){
  if(som.nivel === 0) return;
  const e = som.efeitos[nome];
  if(!e) return;
  
  const a = e.vozes[e.i = (e.i + 1) % VOZES];
  if(a.quebrada) return;
  
  /* Isola o currentTime para que, se ele falhar, não cancele o play() */
  try { a.currentTime = 0; } catch(err){}
  
  try { a.play().catch(() => {}); } catch(err){}
}
function proximaFaixa(){
  const boas = som.faixas.filter(a => !a.quebrada);
  if(!boas.length) return;
  /* PARA TODAS antes de tocar a próxima. Sem isto, duas faixas dividem a
     mesma mesa e o jogo um barulhão!. */
  pararTrilha();
  /* A PRIMEIRA é sorteada; as seguintes seguem em fila. Assim duas partidas
     seguidas não abrem com a mesma música e, como a fila continua, também
     não fica repetindo a mesma por sorteio azarado. */
  som.atual = som.atual < 0 ? Math.floor(Math.random() * boas.length)
                            : (som.atual + 1) % boas.length;
  const a = boas[som.atual];
  /* com preload='none' o arquivo só começa a baixar aqui, na hora de tocar */
  if(a.preload === 'none'){ a.preload = 'auto'; try { a.load(); } catch(e){} }
  try { a.currentTime = 0; } catch(e){}
  a.play().then(() => { som.destravado = true; })
          .catch(() => destravarNoPrimeiroGesto());
}
function pararTrilha(){
  som.faixas.forEach(a => { try{ a.pause(); a.currentTime = 0; }catch(e){} });
}
/* O botão DESCE: Som (tudo) → Efeitos → Mudo → Som…
  */
function alternarSom(){
  som.nivel = (som.nivel + 2) % 3;
  if(som.nivel === 2){ som.atual = -1; proximaFaixa(); } else pararTrilha();
  if(som.nivel > 0) tocar('jogarCarta');
  guardarSom();
  pintarSom();
}
function pintarSom(){
  $('rotSom').textContent = ['Mudo', 'Efeitos', 'Som'][som.nivel];
  $('btnSom').setAttribute('aria-pressed', String(som.nivel > 0));
  $('btnSom').title = ['Sem som', 'Só efeitos, sem trilha', 'Efeitos e trilha'][som.nivel];
  $('icoSom').innerHTML = '<use href="#' + (som.nivel ? 'i-som' : 'i-mudo') + '"/>';
}
/* Quem desligou uma vez não quer ser surpreendido na próxima partida. */
function guardarSom(){ try{ localStorage.setItem('minerais.som', String(som.nivel)); }catch(e){} }
(function lerSom(){
  try{ const v = localStorage.getItem('minerais.som');
       if(v !== null) som.nivel = Math.max(0, Math.min(2, Number(v))); }catch(e){}
})();

/* ============================================================
   DE QUEM É A VEZ  x  DE QUEM É A TELA

   O `Solo` vem do solo.js, que só existe quando a partida é contra o
   computador. Sem ele, tudo se comporta como antes.
   ============================================================ */
/* `?modo=dupla` é o revezamento no mesmo aparelho. Sem parâmetro, é
   partida normal; com `?bot=`, é contra o computador. */
const MODO = new URLSearchParams(location.search).get('modo') || '';
const modoSolo = () => (typeof Solo !== 'undefined') && Solo.ativo;
const EU  = () => modoSolo() ? Solo.humano : est.vez;
const OP  = () => 1 - EU();
/* Trava as jogadas humanas enquanto o bot pensa. Sem isto a pessoa
   clicaria uma carta na vez do bot e o motor aplicaria a jogada AO BOT,
   porque o Motor.aplicar age sobre est.vez. */
const minhaVez = () => !modoSolo() || est.vez === Solo.humano;
function nomeJog(i){
  if(modoSolo()) return Solo.nomes[i] || T.jogadores[i];
  return T.jogadores[i];
}

let est, sel = null, painelAberto = null;
/* O `est` é `let`, e `let` no topo de um script clássico NÃO vira
   propriedade do window — só `function` vira. O solo.js precisa enxergar o
   estado, então a porta é esta, e é só de leitura. */
window.estadoAtual = () => est;
let vistas = new Set(), geoAnterior = [null,null];
let segundos = SEG_TURNO;
const $ = id => document.getElementById(id);
const base = id => DADOS.cartas.find(c => c.id === id) || {};
const blocosSemCor = {};
function blocoDe(c){
  const k = COR[c.bloco];
  if(k) return k;
  if(c.bloco && !blocosSemCor[c.bloco]){
    blocosSemCor[c.bloco] = 1;
    console.warn('Bloco sem cor no mesa.js: "' + c.bloco + '". Caiu no padrão.');
  }
  return CORPADRAO;
}
/* O selo do canto é o símbolo químico, que vem de `elemento` no dados.js.
   As cartas de base não são um elemento só, então lá o campo traz a
   fórmula ou uma abreviação curta. Faltando, mostra o traço e não o '?',
   que parecia defeito. */
const simboloDe = (c,b) => c.liga ? '⚒' : (SIGLA[b.elemento] || b.elemento || '—');

/* A MÃO CHEIA CABE EM UMA LINHA SÓ.

   Com 8 cartas (o maoMax de hoje)
   Em vez de fixar uma margem menor no CSS e torcer, isto MEDE a janela que
   a pessoa tem agora e ENCOLHE a carta o tanto exato para a fila caber.
   Piso de 130 px. Abaixo disso o nome vira reticências em quase tudo e não
   vale mais a pena — aí a mão volta a quebrar linha, que é o que acontece
   em janela estreita até a versão de celular ficar pronta. */

const CARTA_LARGA = 166;
const ehCelular = () => matchMedia('(orientation:landscape) and (max-height:560px)').matches;
const cartaMin = () => ehCelular() ? 74 : 130;

function encaixarMao(zm){
  const cartas = [...zm.children];
  zm.style.removeProperty('--larguraCarta');
  if(!cartas.length) return;

  const e = getComputedStyle(cartas[0]);
  const e2 = getComputedStyle(zm);
  const margens = parseFloat(e.marginLeft) + parseFloat(e.marginRight);
  /* clientWidth INCLUI o padding da caixa.*/
  const pd = parseFloat(e2.paddingLeft) + parseFloat(e2.paddingRight);
  const disponivel = zm.clientWidth - pd - 2;            // 2px de respiro
  const larguraCheia = ehCelular() ? 96 : CARTA_LARGA;
  const cabeInteira = cartas.length * (larguraCheia + margens);
  if(cabeInteira <= disponivel) return;                  // janela grande: nada a fazer

  const alvo = Math.floor(disponivel / cartas.length) - margens;
  if(alvo < cartaMin()) return;                          // apertado demais: quebra linha
  zm.style.setProperty('--larguraCarta', alvo + 'px');
}
/* Redesenhar ao mudar o tamanho da janela: sem isto, quem maximiza no meio
   da partida fica com a mão encolhida à toa. */
addEventListener('resize', () => { if(est) encaixarMao($('mao')); });

/* ============================================================
   PARTIDA
   ============================================================ */
function novaPartida(){
  /* Registra a que estava em andamento ANTES de jogá-la fora. */
  if(est && est.fim === null && typeof Telemetria !== 'undefined')
    Telemetria.registrar(montarRegistro, 'nova');
  est = Motor.novoJogo(DADOS, (Math.random()*1e9)|0);
  sel = null; painelAberto = null;
  vistas = new Set(); geoAnterior = [null,null];
  if(modoSolo()) Solo.sortearLados();
  fecharTelas(); fecharPainel(); montarAvatares(); reiniciarRelogio(); desenhar();
  if(modoSolo()) Solo.talvezJogar();
}
/* ============================================================
   O DANO QUE NINGUÉM CAUSOU — exaustão e especulação
   ============================================================

   São os dois únicos danos do jogo 
   São mecânicas diferentes e o motor as trata em ramos separados:

     tem carta na jazida?
       SIM · e a mão está cheia -> ESPECULAÇÃO. Sempre -1, fixo. Vai
                                   direto na força, não toca barreira.
       SIM · mão com espaço     -> compra normal, nada acontece.
       NÃO                      -> EXAUSTÃO. Progressiva (1, 2, 3...) e
                                   come as barreiras antes da força.

    */

function fotografar(){
  const f = { jog: [], cartas: {} };
  est.jogadores.forEach(j => {
    f.jog.push({ reserva: j.reserva, exaustao: j.exaustao || 0 });
    j.campo.forEach(c => { f.cartas[c.uid] = c.defesa; });
  });
  return f;
}

/* Um "-2" que sobe e some, colado no elemento que perdeu o ponto. */
function flutuar(alvo, texto, tipo){
  if(!alvo) return;
  const el = document.createElement('span');
  el.className = 'flutua ' + (tipo || '');
  el.textContent = texto;
  alvo.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

function mostrarDanoSemAgressor(antes, linhas){
  const arena = $('arena');
  let houveExaustao = -1, danoExaustao = 0, especulou = -1;

  /* CAUSA, NÃO EFEITO. 
       exaustão    -> o contador j.exaustao subiu. Só o motor mexe nele, e
                      só no ramo da jazida vazia.
       especulação -> o motor escreveu "Mão cheia" no registro deste lance.
     Combate não produz nem uma coisa nem outra, então não dispara nada. */
  const houveEspeculacao = (linhas || []).some(l => /Mão cheia/i.test(l));

  est.jogadores.forEach((j, i) => {
    const a = antes.jog[i];
    if(!a) return;
    if((j.exaustao || 0) > a.exaustao){
      houveExaustao = i;
      danoExaustao = (j.exaustao || 0);     // o dano É o contador novo
    } else if(houveEspeculacao && j.reserva < a.reserva){
      especulou = i;
    }
  });

  /* Nenhuma das duas: foi combate, refino ou jogada normal. Sai sem
     desenhar nada — o dano de combate a pessoa já entende, porque ela
     mesma mandou a carta bater. */
  if(houveExaustao < 0 && especulou < 0) return;

  /* 1. O número em cima de CADA carta que perdeu dureza. Era o que estava
        faltando: a barreira absorvia e a ficha continuava mostrando o
        número velho até sumir. */
  const perdidas = [];
  est.jogadores.forEach(j => j.campo.forEach(c => {
    const d0 = antes.cartas[c.uid];
    if(d0 !== undefined && c.defesa < d0){
      flutuar(arena.querySelector('.f[data-uid="' + c.uid + '"]'), '-' + (d0 - c.defesa), 'naCarta');
    }
  }));
  /* cartas que sumiram do campo: o muro foi consumido inteiro */
  Object.keys(antes.cartas).forEach(uid => {
    const viva = est.jogadores.some(j => j.campo.some(c => String(c.uid) === String(uid)));
    if(!viva) perdidas.push(uid);
  });

  /* 2. O número em cima do escudo de quem perdeu força. */
  est.jogadores.forEach((j, i) => {
    const a = antes.jog[i];
    if(!a || j.reserva >= a.reserva) return;
    const meu = (i === est.vez);
    flutuar($(meu ? 'heroiEu' : 'heroiOp'), '-' + (a.reserva - j.reserva), 'naForca');
  });

  /* 3. O cartaz grande, só para a exaustão e a especulação. */
  if(houveExaustao >= 0){
    const j = est.jogadores[houveExaustao], a = antes.jog[houveExaustao];
    const naForca = a.reserva - j.reserva;      // quanto passou da barreira
    const segurou = naForca <= 0;
    cartaz('A jazida acabou', '-' + danoExaustao,
      perdidas.length && !segurou ? 'A barreira caiu e ainda doeu'
      : perdidas.length           ? 'Consumiu sua barreira'
      : segurou                   ? 'A barreira segurou o golpe'
      : 'Sua força está sendo corroída',
      segurou ? 'absorvido' : '');
  } else if(especulou >= 0){
    cartaz('Mão cheia', '-1', 'A carta se perdeu: você especulou', 'especulacao');
  }
}

/* ============================================================
   A FALA DO ADVERSÁRIO
   ============================================================ */
function falaDoBot(acao, linhas, quemAgiu){
  /* `quemAgiu` é capturado ANTES do Motor.aplicar. Tem que ser: o
     `passar` troca a vez, então perguntar depois faria o "Encerrou o
     turno" do bot aparecer com o nome da pessoa — ou não aparecer. */
  if(!modoSolo() || quemAgiu === Solo.humano) return;
  const arena = $('arena');
  if(!arena) return;

  const nomeDe = uid => {
    for(const j of est.jogadores){
      const c = j.campo.find(x => x.uid === uid) || j.mao.find(x => x.uid === uid);
      if(c) return curto(c.nome);
    }
    // já saiu do campo (morreu no combate): tenta o registro
    const m = (linhas || []).join(' ').match(/^(\w[\wÀ-ÿ ]*?) /);
    return m ? m[1] : 'a carta';
  };

  let txt = '';
  if(acao.tipo === 'jogar')        txt = 'Extraiu ' + nomeDe(acao.uid);
  else if(acao.tipo === 'refinar') txt = 'Refinou ' + nomeDe(acao.uid) + ' — virou barreira';
  else if(acao.tipo === 'fundir')  txt = 'Forjou ' + acentuar(acao.liga);
  else if(acao.tipo === 'atacar')  txt = acao.alvo === 'reserva' ? 'Atacou seu escudo' : 'Atacou sua carta';
  else if(acao.tipo === 'passar')  txt = 'Encerrou o turno';
  if(!txt) return;


  const el = document.createElement('div');
  el.className = 'falaBot' + (acao.tipo === 'fundir' ? ' forte' : '');
  el.setAttribute('role', 'status');
  el.innerHTML = '<b>' + esc(nomeJog(quemAgiu)) + '</b><span>' + esc(txt) + '</span>';
  arena.appendChild(el);
  setTimeout(() => el.remove(), acao.tipo === 'fundir' ? 3000 : 2200);
}

function cartaz(rot, num, pe, extra){
  const el = document.createElement('div');
  el.className = 'golpeExaustao' + (extra ? ' ' + extra : '');
  el.setAttribute('role', 'status');
  el.innerHTML = '<span class="rot">' + esc(rot) + '</span>' +
                 '<span class="num">' + esc(num) + '</span>' +
                 '<span class="pe">' + esc(pe) + '</span>';
  ($('arena') || document.body).appendChild(el);
  setTimeout(() => el.remove(), 1900);
}

function agir(acao){
  /* Na vez do bot, clique humano não vale. O `Solo.pensando` é a única
     porta por onde a jogada do computador entra. */
  if(!minhaVez() && !(modoSolo() && Solo.pensando)) return false;

  const antesLog = est.log.length;
  const antesLigas = Motor.ligasDisponiveis(est, DADOS).length;
  const foto = fotografar();
  const quemAgiu = est.vez;
  const r = Motor.aplicar(est, DADOS, acao);
  if(!r.ok){ tocar(/barreira/i.test(r.erro) ? 'barreira' : 'jogadaInvalida'); aviso(r.erro); return false; }

  const novas = est.log.slice(antesLog);
  sonsDaJogada(acao, novas);
  falaDoBot(acao, novas, quemAgiu);   // antes do desenhar: precisa do nome da carta
  sel = null; fecharPainel();
  if(acao.tipo === 'passar') reiniciarRelogio();
  desenhar();
  /* DEPOIS do desenhar, obrigatoriamente: o desenhar refaz as fichas do
     zero, então um número colado numa ficha antiga seria jogado fora. */
  mostrarDanoSemAgressor(foto, novas);
  // o botão de liga acabou de acender? avisa com som, é o que ensina a escada
  if(Motor.ligasDisponiveis(est, DADOS).length > antesLigas) tocar('ligaDisponivel');
  if(est.fim !== null){
    tocar('fimPartida');
    /* A partida vai para o servidor sozinha. O botão "Guardar" continua
       */
    if(typeof Telemetria !== 'undefined') Telemetria.registrar(montarRegistro, 'fim');
  }
  if(modoSolo()) Solo.talvezJogar();
  return true;
}

/* Traduz a jogada aceita (e o que ela escreveu no registro) em efeitos.
   Ler o registro em vez de recalcular estado mantém isto fora das regras. */
function sonsDaJogada(acao, novasLinhas){
  const texto = novasLinhas.join(' | ');
  if(acao.tipo === 'jogar')   tocar('jogarCarta');
  if(acao.tipo === 'refinar') tocar('refinar');
  if(acao.tipo === 'fundir')  tocar('forjarLiga');
  if(acao.tipo === 'atacar')  tocar(acao.alvo === 'reserva' ? 'atacarHeroi' : 'atacarCarta');
  if(acao.tipo === 'passar'){
    tocar('passarTurno');
    if(/Exaustão/.test(texto))   tocar('exaustao');
    else if(/Mão cheia/.test(texto)) tocar('especulacao');
    else tocar('comprarCarta');
  }
  if(/se esgotou/.test(texto)) tocar('cartaEsgotada');
}
function aviso(msg){
  const li = document.createElement('li');
  li.className = 'err';
  li.innerHTML = '<b>⚠</b><span>' + esc(msg) + '</span>';
  $('log').prepend(li);
}

/* avatares sorteados pela semente: mesma partida, mesmos rostos */
function montarAvatares(){
  /* Os índices eram FIXOS (0 e 1), mas `avatarEu` e `avatarOp` são
     posições da TELA, não jogadores. Quando o humano é o jogador 2, o
     retrato dele ia para o lado do adversário e vice-versa. Agora usa a perspectiva. */
  [['avatarEu', EU()], ['avatarOp', OP()]].forEach(([id, i]) => {
    const el = $(id);
    const n = ((est.semente >> (i * 3)) % 4) + 1;
    el.textContent = String(i + 1);
    el.classList.remove('temArte');
    el.style.removeProperty('--retrato');
    el.tabIndex = 0;   // dá para chegar na lupa pelo teclado, não só pelo mouse
    /* Contra o computador, o retrato do adversário é o MESMO da tela de
       escolha (bots/<id>.png). A pessoa escolheu aquela cara; ver outra na
       mesa quebra a ligação. */
    const ehBot = modoSolo() && i !== Solo.humano && Solo.id;
    seExistirUm(comFormatos(ehBot ? 'bots/' + Solo.id
                                  : 'avatares/' + String(n).padStart(2,'0')),
      u => {
        el.innerHTML = ''; const im = new Image(); im.alt=''; im.src = u; el.appendChild(im);
        /* a lupa do hover é um ::after com a mesma imagem: só liga quando
           a arte existe de verdade, senão cresceria um quadrado vazio */
        el.style.setProperty('--retrato', 'url("' + u + '")');
        el.classList.add('temArte');
      });
  });
}

/* Assinatura do conjunto de dados. A semente só reconstrói a partida se o
   POOL for o mesmo: mudar uma coluna de cópias na planilha já embaralha tudo
   diferente. Gravar isto junto é o que permite, meses depois, saber com qual
   dados.js aquele registro foi jogado. */
function assinaturaDados(){
  let h = 0;
  DADOS.cartas.forEach(c => {
    const linha = c.id + ':' + c.copias + ':' + c.ataque + ':' + c.defesa + ':' + c.custo;
    for(let i = 0; i < linha.length; i++) h = (h * 31 + linha.charCodeAt(i)) | 0;
  });
  return { cartas: DADOS.cartas.length,
           pool: DADOS.cartas.reduce((s, c) => s + c.copias, 0),
           hash: (h >>> 0).toString(16) };
}

/* MONTAR e BAIXAR viraram duas coisas.

   A telemetria precisa do MESMO registro que o botão baixa  */
function montarRegistro(motivo){
  return { versaoMotor: Motor.versao, dados: assinaturaDados(),
                quando: new Date().toISOString(),
    /* por que a partida terminou de ser registrada:
       'fim' venceu ou perdeu · 'abandono' fechou a aba ou saiu
       'nova' começou outra por cima · 'manual' clicou em Guardar */
    motivo: motivo || 'manual',
    semente: est.semente, cfg: est.cfg, turnos: est.turno, fim: est.fim,
    acoes: est.acoes, log: est.log,
    /* QUEM JOGOU. Sem isto o arquivo guardado não diz contra quem a
       partida foi, e um relatório de dez partidas vira ilegível. */
    partida: {
      modo: modoSolo() ? 'solo' : (MODO === 'dupla' ? 'humano x humano' : 'livre'),
      jogadores: [nomeJog(0), nomeJog(1)],
      adversarioBot: modoSolo() ? { id: Solo.id, nome: Solo.nomeBot, perfil: Solo.perfil } : null,
      humano: modoSolo() ? Solo.humano : null,
      vencedor: est.fim === 'empate' ? 'empate'
              : (est.fim === null ? null : nomeJog(est.fim)),
      turnos: est.turno
    } };
}
function guardarPartida(){
  const reg = montarRegistro('manual');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(reg, null, 1)], {type:'application/json'}));
  a.download = 'partida-' + est.semente + '-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ---------- relógio (local e decorativo) ---------- */
function reiniciarRelogio(){ segundos = SEG_TURNO; pintarRelogio(); }
function pintarRelogio(){
  $('segundos').textContent = segundos;
  $('barraTempo').style.width = (segundos / SEG_TURNO * 100) + '%';
  $('relogio').classList.toggle('pouco', segundos <= 15);
}
/* O RELÓGIO ENCERRA O TURNO SOZINHO.

   Endurecido em 10/08: antes, se o `passar` fosse recusado por qualquer
   motivo, `segundos` ficava em zero e o aviso se repetia a cada segundo,
   para sempre. Agora o relógio é reiniciado ANTES da jogada, então
   aconteça o que acontecer ele volta a contar.

   Contra o computador não existe "passe o aparelho": não há aparelho para
   passar, e a mão do adversário nunca esteve visível. */
setInterval(() => {
  if(!est || est.fim !== null) return;
  /* Tela aberta PARA o relógio — mas isso só é justo contra o computador.
     Entre dois humanos, parar o cronômetro abrindo a ajuda seria um jeito
     de ganhar tempo, então lá ele continua correndo (e a tela de ajuda
     avisa disso). */
  if($('balao')) return;
  if($('telas').firstChild && (modoSolo() || MODO !== 'dupla')) return;
  if(modoSolo() && !minhaVez()) return;         // o relógio é da pessoa, não do bot
  segundos--;
  if(segundos === 10) tocar('tempoAcabando');   // toca uma vez, a 10 segundos do fim
  if(segundos <= 0){
    reiniciarRelogio();
    aviso('Tempo esgotado — turno encerrado.');
    agir({tipo:'passar'});
    /* A tela "passe o aparelho" só existe no revezamento de verdade, que
       hoje é o `?modo=dupla`. Sem isso ela aparecia contra o computador —
       não há aparelho para passar, e a mão do bot nunca esteve visível. */
    if(est.fim === null && MODO === 'dupla') telaPassagem();
    return;
  }
  pintarRelogio();
}, 1000);

/* ============================================================
   FICHA — degrau em cima, disco, nome embaixo
   ============================================================ */
/* "Esta ficha ainda não pode agir." Do meu lado é a prontidão do motor;
   do lado do adversário é ter chegado agora, porque a prontidão dele
   volta sozinha no turno seguinte e não me diz nada. */
function dormindo(c, meu){
  if(meu) return !c.pronta;
  return !c.pronta && c.estreouNoTurno != null && (est.turno - c.estreouNoTurno) <= 1;
}

function fichaEl(c, meu){
  const b = base(c.cartaId), bl = blocoDe(c);
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'f' + (meu ? ' meu' : ' op') + ' n' + (c.nivel || 0)
               + (c.barreira ? ' barreira' : '')
               /* O Zzz vale para os DOIS lados. Antes só a minha ficha
                  dormia; a que o adversário acabou de baixar parecia
                  pronta, e some a informação de que ela ainda não ataca.

                  Mas do lado dele NÃO basta `!pronta`: ficha que atacou
                  também fica assim, e ela vai acordar no turno dele de
                  qualquer jeito. O que interessa é "acabou de chegar", e
                  isso é o `estreouNoTurno` — o turno em que ela pisou no
                  campo. Um turno de diferença = entrou na vez passada. */
               + (dormindo(c, meu) ? ' dorme' : '') + (sel === c.uid ? ' sel' : '')
               + (vistas.has(c.uid) ? '' : ' entra');
  vistas.add(c.uid);
  el.style.setProperty('--cor', bl.c); el.style.setProperty('--corS', bl.s);
  el.dataset.uid = c.uid;                                          // achar a ficha depois
  if(!meu){ el.dataset.drop = 'ficha'; }                           // alvo de arrasto

  const simbolo = simboloDe(c, b);
  el.innerHTML =
    '<span class="nivel" data-dica="degrau">' + nomeNivel(c) + '</span>' +
    '<span class="disco">' +
      '<span class="simbChip' + (simbolo.length > 2 ? ' peq' : '') + '">' + esc(simbolo) + '</span>' +
    '</span>' +
    '<span class="num v">' + c.ataque + '</span>' +
    '<span class="num d">' + Math.max(0, c.defesa) + '</span>' +
    (c.barreira ? '<span class="muro" data-dica="barreira"><svg class="ic"><use href="#i-barreira"/></svg></span>' : '') +
    '<span class="nome">' + esc(curto(c.nome)) + '</span>';

  carregarArte(caminhosArte(c, b, 'ficha'),
    img => { const d = el.querySelector('.disco'); if(d) d.prepend(img); });
  el.setAttribute('aria-label', curto(c.nome) + ', ' + nomeNivel(c) + '. ' + T.valor + ' ' + c.ataque +
    ', ' + T.dureza + ' ' + Math.max(0,c.defesa) +
    (c.barreira ? '. Faz barreira.' : '') +
    (dormindo(c, meu) ? '. Descansando.' : ''));
  ligarPrevia(el, c);
  return el;
}

/* ============================================================
   CARTA da mão
   ============================================================ */
function cartaEl(c){
  const b = base(c.cartaId), bl = blocoDe(c);
  const el = document.createElement('button');
  el.type = 'button';
  
  // Adiciona a classe visual .n1 se a carta já sofreu P&D
  el.className = 'c' + (c.nivel >= 1 ? ' n1' : '') + (vistas.has(c.uid) ? '' : ' entra');
  vistas.add(c.uid);
  el.style.setProperty('--cor', bl.c); el.style.setProperty('--corS', bl.s);

  const dureza = Math.max(0, c.defesa);
  const simbolo = simboloDe(c, b);

  /* O selo "vira barreira" saiu: aparecia em TODAS as cartas não refinadas
     (a regra vale para todas), então não distinguia nada — era ruído
     constante ocupando a lateral. Fica só o selo de quem JÁ é barreira,
     que é informação de verdade. */
  let seloHtml = '';
  if(c.nivel >= 1) {
    seloHtml = '<span class="selo barreiraSelo" style="background:var(--ouroEsc);color:#fff" data-dica="barreira">P&D (REFINADO)</span>';
  } else if(b.defesa >= (est ? (est.cfg.barreiraDureza ?? 99) : 99)) {
    seloHtml = '<span class="selo barreiraSelo" data-dica="barreira">barreira</span>';
  }

  el.innerHTML =
    hexEnergia(c.custo) +
    '<span class="badge sim' + (simbolo.length > 2 ? ' peq' : '') + '">' + esc(simbolo) + '</span>' +
    selo('val', 'i-valor',  c.ataque) +
    selo('dur', 'i-dureza', dureza) +

    '<span class="tit"><span class="n">' + esc(curto(c.nome)) + '</span>' +
      '<span class="sub' + ((c.nivel || 0) >= 1 || c.liga ? ' subRef' : '') + '">' +
      esc(nomeNivel(c).toUpperCase()) + '</span></span>' +
    '<span class="lugarArte"></span>' +
    seloHtml +
    '<span class="mohs" data-dica="dureza">' + Array.from({length:10},(_,i)=>'<i class="'+(i<Math.round(dureza)?'on':'')+'"></i>').join('') + '</span>';

  const arte = document.createElement('span');
  arte.className = 'arte';
  arte.innerHTML = '<span class="vazio"><svg class="ic"><use href="#i-pedra"/></svg></span>';
  carregarArte(caminhosArte(c, b, 'retrato'),
    img => { arte.innerHTML = ''; arte.appendChild(img); });
  el.querySelector('.lugarArte').replaceWith(arte);

  el.setAttribute('aria-label', curto(c.nome) + '. Custa ' + c.custo + ' de energia. ' +
    T.valor + ' ' + c.ataque + ', ' + T.dureza + ' ' + dureza);
  ligarPrevia(el, c);
  return el;
}

/* ---------- prévia grande ---------- */
function ligarPrevia(el, c){
  const abrir = () => { if(!document.body.classList.contains('arrastandoAlgo')) previa(c); };
  el.addEventListener('mouseenter', abrir);
  el.addEventListener('focus', abrir);
  el.addEventListener('mouseleave', fecharPrevia);
  el.addEventListener('blur', fecharPrevia);
}
function previa(c){
  const b = base(c.cartaId), bl = blocoDe(c);
  const dureza = Math.max(0, c.defesa);
  const simbolo = simboloDe(c, b);
  let chave, desc, frase = '', sub;
  if(c.liga){
    const lg = DADOS.ligas.find(l => l.nome === c.liga);
    chave = 'LIGA FORJADA';
    sub = 'LIGA';
    desc = lg && lg.refinado ? acentuar(lg.refinado) : c.partes.map(curto).join(' + ');
    frase = lg ? acentuar(lg.ensina) : '';
  } else {
    chave = bl.chave;
    sub = nomeNivel(c).toUpperCase();
    /* o nome do degrau em que ela está: minério no chão, refinado depois */
    desc = nomeDegrau(c, b);
    frase = acentuar(semJargao(b.frase || ''));
  }
  const p = $('previa');
  p.innerHTML =
    '<div class="pc" style="--cor:' + bl.c + ';--corS:' + bl.s + '">' +
      hexEnergia(c.liga ? 0 : c.custo) +
      '<span class="badge sim' + (simbolo.length > 2 ? ' peq' : '') + '">' + esc(simbolo) + '</span>' +
      selo('val', 'i-valor',  c.ataque) +
      selo('dur', 'i-dureza', dureza) +
      '<div class="dentro">' +
        '<div class="cab"><h4>' + esc(curto(c.nome)) + '</h4><span class="chip">' + esc(sub) + '</span></div>' +
        '<div class="quadro" id="quadroPrevia"><span class="vazio"><svg class="ic"><use href="#i-pedra"/></svg></span></div>' +
        '<div class="mohsP">' + Array.from({length:10},(_,i)=>'<i class="'+(i<Math.round(dureza)?'on':'')+'"></i>').join('') + '</div>' +
        '<div class="caixa"><div class="chave">' + esc(chave) + '</div>' +
          (desc ? '<p class="desc">' + esc(desc) + '</p>' : '') +
          (frase ? '<p class="frase">' + esc(frase) + '</p>' : '') + '</div>' +
      '</div></div>';
  carregarArte(caminhosArte(c, b, 'retrato'),
    img => { const q = $('quadroPrevia'); if(q){ q.innerHTML = ''; q.appendChild(img); } });
  p.classList.add('on');
}
function fecharPrevia(){ $('previa').classList.remove('on'); }

/* ============================================================
   ARRASTAR
   ============================================================ */
/* Abra com  jogo-v7.html?debug=arrasto  para o console contar o que acontece
   em cada gesto: se o pointerdown chega, se o movimento passa do limiar, e
   qual zona foi encontrada ao soltar. É o jeito de finalmente pegar o bug
   da primeira carta na SUA máquina, que aqui não reproduz. */
const DEPURAR = /[?&]debug=arrasto/.test(location.search);
const dlog = (...a) => { if(DEPURAR) console.log('[arrasto]', ...a); };

function arrastavel(el, carga){
  el.addEventListener('pointerdown', ev => {
    dlog('pointerdown', carga.tipo, carga.uid, 'botao=' + ev.button,
         'desabilitado=' + el.disabled, 'tipoPonteiro=' + ev.pointerType);
    if(ev.button || el.disabled) return;
    const x0 = ev.clientX, y0 = ev.clientY, pid = ev.pointerId;
    let ativo = false, fantasma = null, ultimo = null;

    /* Captura do ponteiro: a partir daqui TODO pointermove e pointerup vem
       para este elemento, aconteça o que acontecer por cima dele. Sem isso,
       qualquer coisa que passe sob o cursor no meio do gesto rouba o
       arrasto — e foi essa família de bug que insistiu em voltar. */
    try { el.setPointerCapture(ev.pointerId); } catch(e){}

    function mover(e){
      if(!ativo && Math.hypot(e.clientX - x0, e.clientY - y0) > 8){
        ativo = true; dlog('comecou a arrastar'); fecharPrevia(); esconderDica();
        const r = el.getBoundingClientRect();
        fantasma = el.cloneNode(true);
        fantasma.className += ' arrasto';
        fantasma.style.width = r.width + 'px';
        fantasma.style.left = '0px'; fantasma.style.top = '0px';
        fantasma.style.margin = '0';
        fantasma.dataset.dx = (r.left - x0); fantasma.dataset.dy = (r.top - y0);
        document.body.appendChild(fantasma);
        el.classList.add('arrastando');
        document.body.classList.add('arrastandoAlgo', 'arr-' + carga.tipo);
      }
      if(!ativo) return;
      e.preventDefault();
      fantasma.style.transform = 'translate(' + (e.clientX + (+fantasma.dataset.dx)) + 'px,' +
        (e.clientY + (+fantasma.dataset.dy)) + 'px) scale(1.04)';
      const z = zonaSob(e.clientX, e.clientY, carga);
      if(z !== ultimo){
        if(ultimo) ultimo.classList.remove('sobre');
        if(z) z.classList.add('sobre');
        ultimo = z;
      }
      /* Sem zona embaixo = soltar aqui não faz nada. O fantasma diz isso
         antes de a pessoa soltar, em vez de ela descobrir depois. */
      fantasma.classList.toggle('recusa', !z);
    }
    /* DESISTIR DO ARRASTO. Antes não havia como: começou a arrastar,
       tinha que soltar em algum lugar e torcer. Agora são três saídas, e
       as três desfazem sem jogar nada:
         · soltar fora de qualquer zona válida
         · apertar Esc no meio do gesto
         · o navegador cancelar o ponteiro (janela perde o foco, etc.)
       E, principalmente, o fantasma AVISA: quando não há zona embaixo do
       dedo, ele fica pálido e torto (.recusa). Soltar ali não faz nada, e
       agora dá para ver isso ANTES de soltar. */
    function limpar(){
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
      removeEventListener('keydown', teclou, true);
      if(fantasma) fantasma.remove();
      fantasma = null;
      el.classList.remove('arrastando');
      document.body.classList.remove('arrastandoAlgo','arr-mao','arr-ficha');
      if(ultimo) ultimo.classList.remove('sobre');
      ultimo = null;
    }
    function teclou(e){
      if(e.key !== 'Escape' || !ativo) return;
      e.preventDefault(); e.stopPropagation();
      dlog('arrasto cancelado no Esc');
      try { el.releasePointerCapture(pid); } catch(err){}
      limpar();
      ativo = false;
    }
    function soltar(e){
      try { el.releasePointerCapture(e.pointerId); } catch(err){}
      if(!ativo){ limpar(); return; }        // foi clique: deixa o click acontecer

      /* ISTO É O BUG DE "DESISTI E ELA FOI JOGADA MESMO ASSIM".
         A carta da mão tem onclick que a joga (é o atalho de clicar em vez
         de arrastar). Como o ponteiro está CAPTURADO por ela, o navegador
         entrega o `click` do fim do gesto a ela — mesmo que a pessoa tenha
         soltado do outro lado da tela. Resultado: desistir jogava a carta.
         Engolimos o clique seguinte, e só ele. */
      const engolir = e2 => { e2.stopPropagation(); e2.preventDefault(); };
      el.addEventListener('click', engolir, {capture:true, once:true});
      setTimeout(() => el.removeEventListener('click', engolir, {capture:true}), 350);

      const z = zonaSob(e.clientX, e.clientY, carga);
      dlog('soltou em', e.clientX, e.clientY, '-> zona =', z ? z.dataset.drop : 'NENHUMA',
           '| por cima estava:', (document.elementFromPoint(e.clientX, e.clientY) || {}).className);
      limpar();
      if(!z) return;                         // desistiu: nada acontece
      if(carga.tipo === 'mao'   && z.dataset.drop === 'campo') agir({tipo:'jogar', uid:carga.uid});
      if(carga.tipo === 'ficha' && z.dataset.drop === 'heroi') agir({tipo:'atacar', uid:carga.uid, alvo:'reserva'});
      if(carga.tipo === 'ficha' && z.dataset.drop === 'ficha') agir({tipo:'atacar', uid:carga.uid, alvo:+z.dataset.uid});
    }
    el.addEventListener('pointermove', mover, {passive:false});
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
    addEventListener('keydown', teclou, true);
  });
}

/* Onde o ponteiro está, para efeito de soltar.

   Antes isto dependia só de `elementFromPoint`, ou seja, do que estava
   PINTADO por cima. Bastava um escudo, um texto de dica, uma prévia ou
   qualquer camada nova passar por ali para o alvo sumir e a carta não
   cair em lugar nenhum — sem erro, sem aviso, só não acontecia nada.

   Agora `elementFromPoint` é só a primeira tentativa. Se ela não achar
   zona válida, o teste é GEOMÉTRICO: o ponteiro está dentro do retângulo
   de alguma zona legítima? Como carta da mão só tem um destino possível,
   soltar em qualquer lugar do seu campo funciona, tenha o que tiver
   desenhado em cima. */
function zonasValidas(carga){
  if(carga.tipo === 'mao') return [$('campoEu')];
  const heroi = $('heroiOp');
  const lista = heroi.classList.contains('bloqueado') ? [] : [heroi];
  return lista.concat([...document.querySelectorAll('#campoOp .f[data-drop="ficha"]:not(.bloqueado)')]);
}
function zonaSob(x, y, carga){
  const alvo = document.elementFromPoint(x, y);
  const z = alvo && alvo.closest ? alvo.closest('[data-drop]') : null;
  if(z){
    if(carga.tipo === 'mao'   && z.dataset.drop === 'campo') return z;
    if(carga.tipo === 'ficha' && z.dataset.drop !== 'campo') return z;
  }
  /* Rede de segurança geométrica: o ponteiro está dentro do retângulo de
     alguma zona legítima, tenha o que tiver pintado por cima?
 */
  const m = carga.tipo === 'mao' ? 0 : 6;
  for(const cand of zonasValidas(carga)){
    if(!cand) continue;
    const r = cand.getBoundingClientRect();
    if(x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m) return cand;
  }
  return null;
}

/* ============================================================
   DESENHO
   ============================================================ */
const ICONE_LOG = l =>
  /Refinou/.test(l) ? '▲' : /Forjou/.test(l) ? '⚒' : /Extraiu/.test(l) ? '⛏' :
  /escudo/.test(l) ? '✦' : /esgotou/.test(l) ? '✕' : /Exaustão/.test(l) ? '⌛' : '·';

function desenhar(){
  const eu = est.jogadores[EU()], op = est.jogadores[OP()];

  $('pino').textContent = est.vez + 1;
  $('quem').textContent = nomeJog(est.vez);
  /* TURNO CORRIDO: turno 1 é do jogador 1, turno 2
     é do jogador 2. Cheguei a trocar por "Rodada" (turno/2) achando que
     confundiria; ele testou e prefere assim, e é o mesmo número que
     aparece no registro e no arquivo guardado. */
  $('turnoTxt').textContent = 'Turno ' + est.turno;
  $('meuNome').textContent = nomeJog(EU());
  $('opNome').textContent  = nomeJog(OP());
  document.body.classList.toggle('vezDoBot', !minhaVez());
  ['capEu','capOp'].forEach(i => $(i).textContent = T.geo);
  /* A ENERGIA DO ADVERSÁRIO. Faltava, e sem ela não dá para prever o que
     ele consegue jogar no turno seguinte — que é metade do planejamento
     num jogo de custo crescente. */
  const eOp = $('opEnergia');
  if(eOp){
    eOp.textContent = op.energia;
    const barra = $('opEnergiaBarra');
    if(barra) barra.innerHTML = Array.from({length: est.cfg.energiaMax},
      (_, i) => '<i class="' + (i < op.energia ? 'on' : '') + '"></i>').join('');
  }
  ['rotResEu','rotResOp'].forEach(i => $(i).textContent = T.reservas);
  $('meuGeo').textContent = eu.reserva;
  $('opGeo').textContent  = op.reserva;
  /* EXAUSTÃO VISÍVEL. Antes ela só existia no registro, então a pessoa via
     a força cair sozinha e não entendia de onde vinha o dano — num jogo
     sobre mineração, "a jazida acabou" é a lição mais importante que tem, e
     ela estava escondida numa linha de log.
     O dano é PROGRESSIVO (engine: j.exaustao sobe 1 a cada compra sem
     baralho, e o dano é o valor novo), então o que se mostra é o tamanho do
     PRÓXIMO golpe, que é a informação que muda a decisão. */
  [[ 'meuRes','rotResEu', eu ], [ 'opRes','rotResOp', op ]].forEach(([bId, rId, j]) => {
    const med = $(rId).closest('.med');
    const vazia = j.baralho.length === 0;
    if(vazia){
      $(bId).textContent = '-' + ((j.exaustao || 0) + 1);
      $(rId).textContent = 'Exaustão';
      med.classList.add('exausto');
      med.classList.remove('acabando');
      med.dataset.dica = 'exaustao';
    } else {
      $(bId).textContent = j.baralho.length;
      $(rId).textContent = T.reservas;
      med.classList.remove('exausto');
      med.classList.toggle('acabando', j.baralho.length <= 3);
      med.dataset.dica = 'reservas';
    }
  });
  $('meuEne').textContent = eu.energia;
  $('subMao').textContent = eu.mao.length + (eu.mao.length === 1 ? ' carta' : ' cartas');

  if(geoAnterior[OP()] !== null && op.reserva < geoAnterior[OP()]) sacode($('heroiOp'));
  geoAnterior[EU()] = eu.reserva; geoAnterior[OP()] = op.reserva;

  $('pilhas').innerHTML = Array.from({length: Math.max(eu.energiaMax, eu.energia)},
    (_, i) => '<i class="' + (i < eu.energia ? 'on' : '') + '"></i>').join('');

  // BUG 8 CORRIGIDO: Mostra as cartas douradas na mão do oponente se elas sofreram P&D
  $('maoOp').innerHTML = op.mao.map((c, i) =>
      '<span class="verso' + (c.nivel >= 1 ? ' p-e-d' : '') + '" style="transform:rotate(' +
      ((i - (op.mao.length - 1) / 2) * 2.4).toFixed(1) + 'deg)"></span>').join('') +
    '<span class="contaMao">' + op.mao.length + ' na mão</span>';

  const alvos = Motor.alvosValidos ? Motor.alvosValidos(est) : null;
  const muros = Motor.barreirasDe ? Motor.barreirasDe(op) : [];
  const faceLivre = !alvos || alvos.includes('reserva');

  // BUG 1 CORRIGIDO: A Barreira agora some corretamente
  const av = $('avisoBarreira');
  if(muros.length){
    av.style.display = 'inline-flex';
    av.className = 'avisoBarreira';
    av.innerHTML = '<svg class="ic"><use href="#i-barreira"/></svg>' + esc(muros.map(m => curto(m.nome)).join(' e ')) + ' faz barreira';
  } else {
    av.style.display = 'none';
  }

  const zOp = $('campoOp'); zOp.innerHTML = '';
  zOp.classList.toggle('mira', sel !== null);
  $('heroiOp').classList.toggle('mira', sel !== null && faceLivre);
  $('heroiOp').classList.toggle('bloqueado', !faceLivre);
  $('heroiOp').onclick = (sel === null || !faceLivre) ? null
                       : () => agir({tipo:'atacar', uid:sel, alvo:'reserva'});
  $('heroiOp').title = !faceLivre
      ? 'Protegido por ' + muros.map(m => curto(m.nome)).join(' e ')
      : (sel === null ? T.geoLonga + ' do adversário'
                      : 'Atingir a ' + T.geoLonga + ' do adversário');
  if(!op.campo.length){
    zOp.innerHTML = '<p class="dica">Sem defensores. Seus ataques vão direto ao escudo dele.</p>';
  }
  op.campo.forEach(c => {
    const el = fichaEl(c, false);
    const legal = !alvos || alvos.includes(c.uid);
    el.classList.toggle('bloqueado', !legal);
    if(!legal) el.dataset.drop = '';          // some como alvo de arrasto também
    el.style.cursor = (sel === null || !legal) ? 'default' : 'pointer';
    el.onclick = (sel === null || !legal) ? null
               : () => agir({tipo:'atacar', uid:sel, alvo:c.uid});
    el.title = !legal ? 'Protegido pela barreira'
             : (sel === null ? curto(c.nome) : 'Atacar ' + curto(c.nome));
    zOp.appendChild(el);
  });

  const zEu = $('campoEu'); zEu.innerHTML = '';
  if(!eu.campo.length){
    zEu.innerHTML = '<p class="dica">Campo vazio. Arraste uma carta da mão para cá ou clique nela.</p>';
  }
  eu.campo.forEach(c => {
    const el = fichaEl(c, true);
    // A classe visual podeRefinar agora só olha para cartas no campo
    const podeRefCampo = Motor.refinaveis(est, DADOS).filter(r => r.local === 'campo');
    if(podeRefCampo.some(r => r.uid === c.uid)) el.classList.add('podeRefinar');
    el.disabled = !c.pronta;
    el.title = c.pronta ? 'Arraste até o alvo, ou clique para selecionar'
                        : 'Entrou agora: ataca no próximo turno';
    el.onclick = () => { sel = (sel === c.uid ? null : c.uid); desenhar(); };
    if(c.pronta) arrastavel(el, {tipo:'ficha', uid:c.uid});
    zEu.appendChild(el);
  });

  const zm = $('mao'); zm.innerHTML = '';
  eu.mao.forEach(c => {
    const el = cartaEl(c);
    const semEnergia = c.custo > eu.energia, semEspaco = eu.campo.length >= est.cfg.campoMax;
    /* O `&& c.nivel === 0` estava errado: o motor recusa QUALQUER carta com
       o campo cheio (engine.js linha 775, "Campo cheio"), inclusive a que
       passou por P&D. A carta refinada ficava acesa na mão, a pessoa
       clicava e não acontecia nada. */
    el.disabled = semEnergia || semEspaco;
    el.title = semEspaco ? 'Campo cheio — encerre o turno ou ataque para abrir vaga'
             : semEnergia ? 'Faltam ' + (c.custo - eu.energia) + ' de energia'
             : 'Extrair por ' + c.custo + ' de energia';
    el.onclick = () => agir({tipo:'jogar', uid:c.uid});
    if(!el.disabled) arrastavel(el, {tipo:'mao', uid:c.uid});
    zm.appendChild(el);
  });
  encaixarMao(zm);
  /* AVISO DE CAMPO CHEIO. Sem ele a mão inteira apagava de uma vez e não
     dizia por quê — parecia o jogo ter travado. */
  const avCampo = $('avisoCampo');
  if(avCampo){
    const cheio = eu.campo.length >= est.cfg.campoMax && minhaVez();
    avCampo.hidden = !cheio;
    if(cheio) avCampo.textContent = 'Campo cheio (' + est.cfg.campoMax +
      ') — ataque ou encerre o turno para abrir vaga';
  }

  // BUG 4 CORRIGIDO: Botões e Contadores Separados
  const podeRef = Motor.refinaveis(est, DADOS).filter(r => r.local === 'campo');
  const podePeD = Motor.refinaveis(est, DADOS).filter(r => r.local === 'mao');
  
  const ligas = Motor.ligasDisponiveis(est, DADOS);
  const quase = Motor.ligasQuaseLa(est, DADOS);
  
  const br = $('btnRefinar');
  br.disabled = !podeRef.length;
  br.classList.toggle('acesaRef', podeRef.length > 0);
  $('contRefino').hidden = !podeRef.length;
  $('contRefino').textContent = '×' + podeRef.length;

  const bp = $('btnPeD');
  if(bp) {
    bp.disabled = !podePeD.length;
    bp.classList.toggle('acesaRef', podePeD.length > 0);
    /* O "×3" saiu: dizer QUANTAS cartas dá para refinar não muda decisão
       nenhuma, e ocupava o lugar do que importa, que é o quanto o refino
       melhora a carta. */
    $('contPeD').hidden = true;
  }

  /* O botão de forjar agora acende em TRÊS estados, e o rótulo embaixo
     diz o que falta. Antes ele só abria quando já dava para forjar (ou
     quase), então a pessoa não tinha como saber que valia a pena segurar
     o Cobre porque falta só o Estanho — e o combo virava sorte. */
  const radar = ligasNoRadar(eu);
  const bf = $('btnForjar');
  bf.disabled = !(ligas.length || quase.length || radar.length);
  bf.classList.toggle('acesa', ligas.length > 0);
  bf.classList.toggle('noRadar', !ligas.length && !quase.length && radar.length > 0);
  $('contLigas').hidden = true;

  /* A LINHA EMBAIXO DO BOTÃO só aparece quando a liga está PRONTA para
     forjar.
     O que está longe continua acessível: é só abrir o painel. */
  const pista = $('pistaLiga');
  if(pista){
    const t = ligas.length
      ? 'Forjar ' + acentuar(ligas[0].nome) + ' — a liga entra com +' +
        est.cfg.bonusLiga + '/+' + est.cfg.bonusLiga +
        (ligas.length > 1 ? '  ·  e mais ' + (ligas.length - 1) : '')
      : '';
    pista.textContent = t;
    pista.hidden = !t;
  }
  
  if(painelAberto) abrirPainel(painelAberto);

  $('log').innerHTML = est.log.length
    ? est.log.slice(-40).reverse().map(l =>
        '<li><b>' + ICONE_LOG(l) + '</b><span>' + esc(acentuar(l)) + '</span></li>').join('')
    : '<li class="vazio">A partida começa agora.</li>';

  if(est.fim !== null) telaFim();
}
function sacode(el){ el.classList.remove('baixa'); void el.offsetWidth; el.classList.add('baixa'); }

/* ---------- painéis de ação ---------- */
function fecharPainel(){ painelAberto = null; $('paineis').innerHTML = ''; }
/* ============================================================
   LIGAS NO RADAR — as que já começaram, mas ainda falta peça.

   O motor tem `ligasDisponiveis` (dá para forjar agora) e `ligasQuaseLa`
   (tenho as peças, falta refinar). Faltava o degrau antes desses dois:
   **tenho UMA peça e preciso da outra.**

   Isto é leitura de tela, não regra — por isso mora aqui e não no
   engine.js. Ele compara nome de carta, do mesmo jeito que o motor faz
   para montar liga.

   Serve para a pessoa ter controle em vez de sorte: ela olha o painel e
   sabe que segurar o Cobre vale a pena porque falta só o Estanho.
   ============================================================ */
function ligasNoRadar(eu){
  const meus = eu.campo.concat(eu.mao).map(c => Motor.chave(c.nome));
  const fora = [];
  DADOS.ligas.forEach(lg => {
    const pool = meus.slice();
    const tenho = [], falta = [];
    lg.cartas.forEach(nome => {
      const i = pool.indexOf(Motor.chave(nome));
      if(i >= 0){ pool.splice(i, 1); tenho.push(nome); } else falta.push(nome);
    });
    if(tenho.length && falta.length) fora.push({nome: lg.nome, cartas: lg.cartas, tenho, falta});
  });
  /* quem está a uma peça só aparece primeiro */
  return fora.sort((a, b) => a.falta.length - b.falta.length);
}

function abrirPainel(qual){
  painelAberto = qual;
  const eu = est.jogadores[EU()];
  const cx = document.createElement('div');
  cx.className = 'pnl painelAcao';
  let html = '', corpo = '';
  
  if(qual === 'refino' || qual === 'ped'){
    const filtro = qual === 'refino' ? 'campo' : 'mao';
    const lista = Motor.refinaveis(est, DADOS).filter(r => r.local === filtro);
    if(!lista.length){ fecharPainel(); return; }
    const titulo = qual === 'refino' ? 'Refinar no Campo' : 'Pesquisa e Desenvolvimento (Mão)';
    html = '<h3><span>' + titulo + '</span><button class="b peq fantasma" id="fechaP">Fechar</button></h3>';
    corpo = lista.map(r => {
      const c = filtro === 'campo' ? eu.campo.find(x => x.uid === r.uid) : eu.mao.find(x => x.uid === r.uid);
      return '<button type="button" class="lg" data-uid="' + r.uid + '">' +
        '<span class="t"><span>' + esc(curto(r.nome)) + '</span><em>' + r.custo + ' energia</em></span>' +
        '<span class="e">' + c.ataque + '/' + Math.max(0,c.defesa) + '  →  ' +
          (c.ataque + est.cfg.refinoValor) + '/' + (Math.max(0,c.defesa) + est.cfg.refinoDureza) +
          (est.cfg.barreiraPorRefino && filtro === 'campo' && !c.barreira ? '  ·  passa a fazer barreira' : '') +
          (est.cfg.barreiraPorRefino && filtro === 'mao' ? '  ·  fará barreira ao entrar' : '') +
        '</span></button>';
    }).join('');
  } else {
    const ligas = Motor.ligasDisponiveis(est, DADOS);
    const quase = Motor.ligasQuaseLa(est, DADOS);
    const radar = ligasNoRadar(eu);
    if(!ligas.length && !quase.length && !radar.length){ fecharPainel(); return; }
    html = '<h3><span>Forjar liga — o degrau de cima</span><button class="b peq fantasma" id="fechaP">Fechar</button></h3>';
    corpo = radar.map(r =>
        '<button type="button" class="lg radar" disabled>' +
        '<span class="t">' + esc(acentuar(r.nome)) + '<em>falta peça</em></span>' +
        '<span class="f2">' + esc(r.cartas.map(curto).join('  +  ')) + '</span>' +
        '<span class="falta">você tem ' + esc(r.tenho.map(curto).join(' e ')) +
          ' · falta <b>' + esc(r.falta.map(curto).join(' e ')) + '</b></span></button>').join('') +
      quase.map(q =>
        '<button type="button" class="lg bloqueada" disabled>' +
        '<span class="t">' + esc(acentuar(q.nome)) + '<em>bloqueada</em></span>' +
        '<span class="f2">' + esc(q.cartas.map(curto).join('  +  ')) + '</span>' +
        '<span class="falta">refine ' + esc(q.naoRefinadas.map(curto).join(' e ')) + '</span></button>').join('') +
      ligas.map(lg =>
        '<button type="button" class="lg" data-liga="' + esc(lg.nome) + '">' +
        '<span class="t">' + esc(acentuar(lg.nome)) +
          '<em>' + (lg.custo ? lg.custo + ' energia' : 'grátis') + '</em></span>' +
        '<span class="f2">' + esc(lg.cartas.map(curto).join('  +  ')) + '</span>' +
        '<span class="e">' + esc(acentuar(lg.ensina)) + '</span></button>').join('');
  }
  cx.innerHTML = html + '<div class="grade">' + corpo + '</div>';
  $('paineis').innerHTML = '';
  $('paineis').appendChild(cx);
  cx.querySelector('#fechaP').onclick = fecharPainel;
  cx.querySelectorAll('.lg[data-uid]').forEach(b => b.onclick = () => agir({tipo:'refinar', uid:+b.dataset.uid}));
  cx.querySelectorAll('.lg[data-liga]').forEach(b => b.onclick = () => agir({tipo:'fundir', liga:b.dataset.liga}));
}

/* ---------- telas ---------- */
function fecharTelas(){ $('telas').innerHTML = ''; }
function tela(html, cls){
  const d = document.createElement('div');
  d.className = 'tela';
  d.innerHTML = '<div class="pnl cartao ' + (cls || '') + '">' + html + '</div>';
  $('telas').appendChild(d);
  const b = d.querySelector('button'); if(b) b.focus();
  return d;
}
function telaPassagem(){
  const d = tela('<div class="selo2"><svg class="ic"><use href="#i-mao"/></svg></div>' +
    '<h2>Passe o aparelho</h2><p>Vez de <b>' + T.jogadores[est.vez] + '</b>. Não espie a mão do outro.</p>' +
    '<div class="acoes"><button class="b" id="pronto">Estou pronto</button></div>');
  d.querySelector('#pronto').onclick = () => { fecharTelas(); reiniciarRelogio(); desenhar(); };
}
function telaFim(){
  if($('telas').querySelector('.fim')) return;
  const t = est.fim === 'empate' ? 'Empate' : T.jogadores[est.fim] + ' venceu';
  const d = tela('<div class="selo2"><svg class="ic"><use href="#i-sup"/></svg></div>' +
    '<h2>' + t + '</h2><p>Partida encerrada no turno ' + est.turno + '. ' + est.acoes.length + ' jogadas.</p>' +
    '<div class="acoes"><button class="b" id="denovo">Nova partida</button>' +
    '<button class="b" id="sairFim">Sair</button>' +
    '<button class="b" id="guarda"><svg class="ic"><use href="#i-baixar"/></svg>Guardar</button></div>', 'fim');
  d.querySelector('#denovo').onclick = novaPartida;
  /* Sair também no fim: quem perdeu nem sempre quer jogar de novo na hora,
     e obrigar a "Nova partida" para depois sair é atrito. */
  d.querySelector('#sairFim').onclick = () => { location.href = 'inicio.html'; };
  d.querySelector('#guarda').onclick = guardarPartida;
}
function telaAjuda(){
  const cfg = est ? est.cfg : Motor.PADRAO;
  const d = tela('<div class="ajuda"><h2>Como jogar (Manual do Iniciante)</h2>' +
    '<p class="abre">Bem-vindo! Neste jogo, você é uma nação disputando o controle do mercado global de recursos minerais. ' +
      'Seu objetivo é simples: <b>zerar a ' + T.geoLonga + ' (o escudo) do adversário antes que ele zere a sua.</b></p>' +
      
    '<h3>1. Entendendo a sua Carta</h3>' +
    '<p>Para jogar, você precisa entender os três números principais que ficam nos cantos de cada carta:</p>' +
    '<div class="atr"><span class="ico" style="background:rgba(224,160,18,.16);color:var(--energia)"><svg class="ic"><use href="#i-energia"/></svg></span>' +
      '<span><b>' + T.energia + ' (Custo)</b><span>O que você paga para extrair, refinar ou forjar. Sobe 1 por turno até 9 e <b>não acumula</b> (o que sobrar, se perde).</span></span></div>' +
    '<div class="atr"><span class="ico" style="background:rgba(176,125,23,.2);color:#e0b642"><svg class="ic"><use href="#i-valor"/></svg></span>' +
      '<span><b>' + T.valor + ' (Ataque)</b><span>A força da sua carta. O dano que ela causa nas cartas inimigas ou no escudo do adversário.</span></span></div>' +
    '<div class="atr"><span class="ico" style="background:rgba(59,110,165,.24);color:#6b9dd0"><svg class="ic"><use href="#i-dureza"/></svg></span>' +
      '<span><b>' + T.dureza + ' (Defesa)</b><span>A resistência da carta. Se ela receber dano igual ou maior que isso em um combate, é destruída e sai do campo.</span></span></div>' +

    '<h3>2. Como funciona o seu Turno</h3><ul>' +
      '<li>Arraste uma carta da mão para o seu campo (pagando o custo). Cabem ' + cfg.campoMax + ' cartas na mesa.</li>' +
      '<li>Carta recém-extraída <b>descansa</b>: ela só pode atacar no turno seguinte.</li>' +
      '<li>O relógio dita o ritmo. Acabou o tempo, o turno passa sozinho.</li>' +
    '</ul>' +

'<h3>3. O Combate (Ataque e Defesa)</h3>' +
    '<p>O combate exige estratégia, pois <b>quem bate também apanha!</b> O dano é cruzado e simultâneo.</p>' +
    '<ul>' +
      '<li><b>Como atacar:</b> Arraste sua carta para cima de uma carta inimiga ou direto para o escudo do adversário.</li>' +
      '<li><b>A Troca de Golpes:</b> A sua carta tira a Dureza (vida) do inimigo usando o seu Valor (ataque). Ao mesmo tempo, o inimigo tira a sua Dureza usando o Valor dele.</li>' +
      '<li><b>Fim da linha:</b> Se a Dureza de uma carta chegar a zero, ela é eliminada da mesa.</li>' +
    '</ul>' +
    
    '<div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-left:4px solid var(--rio); padding:12px 16px; margin:14px 0; border-radius:6px; font-size:14px;">' +
      '<b style="color:var(--rio2); text-transform:uppercase; letter-spacing:0.05em; font-family:var(--disp);">🥊 Exemplo prático:</b><br>' +
      '<div style="margin-top:6px; line-height:1.5;">' +
      'A sua carta tem <b>4 de Ataque</b> e <b>5 de Dureza</b>.<br>' +
      'Você decide atacar uma carta inimiga que tem <b>2 de Ataque</b> e <b>4 de Dureza</b>.<br>' +
      '<hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:8px 0;">' +
      '<b>O que acontece na mesa?</b><br>' +
      '&bull; O inimigo toma seus 4 de dano. A Dureza dele zera e ele é <b>destruído</b>!<br>' +
      '&bull; A sua carta toma 2 de dano de volta. A Dureza dela cai para 3, mas ela <b>sobrevive no campo</b> para lutar de novo.' +
      '</div>' +
    '</div>'  +

    '<h3>4. A Escada Mineral e a Barreira</h3>' +
    '<p>Uma pedra bruta no chão não protege um país. Quem transforma se protege!</p>' +
    '<div style="display:flex; gap:10px; margin:14px 0; font-family:var(--disp); font-size:14px; text-transform:uppercase; letter-spacing:0.08em;">' +
      '<div style="background:var(--b3); padding:4px 12px; border-radius:6px; color:#fff;">Concentrado</div><div style="padding-top:4px;">&rarr;</div>' +
      '<div style="background:var(--b2); padding:4px 12px; border-radius:6px; color:#fff;">Refinado</div><div style="padding-top:4px;">&rarr;</div>' +
      '<div style="background:var(--b4); padding:4px 12px; border-radius:6px; color:#fff;">Liga</div>' +
    '</div>' +
    '<ul>' +
      '<li><b>Concentrado:</b> Toda carta entra bruta no campo. Elas são mais fracas e não te defendem.</li>' +
      '<li><b>Refinar:</b> Pagando energia, você evolui a carta. Ela ganha <b>+' + cfg.refinoValor + ' de força e +' + cfg.refinoDureza + ' de dureza</b>, e vira uma <b>Barreira</b>. <i>(Dica: Refinar não gasta o seu direito de atacar naquele turno!)</i></li>' +
      '<li><b>A Regra da Barreira:</b> Enquanto houver uma carta refinada (ou liga) no seu campo, ela é o <b>único alvo possível</b>. O inimigo é obrigado a derrubá-la antes de atacar seu escudo ou cartas menores.</li>' +
      '<li><b>Forjar Liga:</b> O degrau máximo. Junte duas cartas <i>já refinadas</i>. A nova liga ganha um salto de <b>+' + cfg.bonusLiga + '/+' + cfg.bonusLiga + '</b> sem custo extra de energia, mas precisa dormir um turno antes de agir.</li>' +
    '</ul>' +

    '<h3>5. Penalidades (Especulação e Exaustão)</h3><ul>' +
      '<li><b>A Mão Cheia (Especulação):</b> O limite da mão é de ' + cfg.maoMax + ' cartas. Se você comprar uma carta com a mão cheia, ela se perde e você toma <b>' + cfg.custoEspeculacao + ' de dano no seu Escudo</b>. O jogo pune quem acumula sem produzir!</li>' +
      '<li><b>A Jazida Acaba (Exaustão):</b> Quando o seu baralho esgota, você entra em exaustão. A cada turno, você toma danos crescentes (1, 2, 3...) que consomem <b>primeiro as suas barreiras</b> e só depois o seu escudo. O tempo é seu inimigo!</li>' +
    '</ul>' +

    '<div class="acoes"><button class="b" id="fecha">Fechar</button></div></div>', 'largo');
  
  d.querySelector('#fecha').onclick = fecharTelas;
  d.addEventListener('click', e => { if(e.target === d) fecharTelas(); });
}

/* ============================================================
   TUTORIAL — modal de verdade (ver BUG 7 no CSS)
   ============================================================ */
/* Os mesmos ícones do resto do jogo, dentro do texto do tutorial: o raio
   é o custo, a pilha de minério é o valor, a gema é a dureza. Escrever
   {energia} no texto vira o ícone. Assim o guia usa a mesma língua visual
   da carta, em vez de descrever com palavra o que a carta mostra com
   desenho. */
const ICONES_TEXTO = {
  energia: ['i-energia', 'var(--energia)'],
  valor:   ['i-valor',   '#e0b642'],
  dureza:  ['i-dureza',  '#6b9dd0'],
  geo:     ['i-escudo',  'var(--geo)'],
  liga:    ['i-liga',    'var(--ouro2)'],
  refinar: ['i-refinar', '#6cd39a'],
  barreira:['i-barreira','#cdd8e6'],
  reservas:['i-reservas','var(--ouro2)']
};
const comIcones = t => String(t).replace(/\{(\w+)\}/g, (m, k) => {
  const i = ICONES_TEXTO[k];
  return i ? '<svg class="ic emLinha" style="color:' + i[1] + '"><use href="#' + i[0] + '"/></svg>' : m;
});

const GUIA = [
  {alvo:'[data-guia="mao"]', ico:'i-mao', t:'Os três números',
   /* Dizia "hexágono dourado". O selo de custo é border-radius:50% — um
      disco. O hexágono é o pino do canto da tela, que é outra coisa.
      Trocado, e agora os três símbolos citados existem de fato nos três
      selos da carta. */
   /* Fala de FORMA e POSIÇÃO, não de ícone. Os selos mostram só o número
      (ver o comentário do `selo` lá em cima), então mandar procurar um
      símbolo que não está desenhado ali era o erro antigo, ao contrário. */
   p:'O disco dourado no alto é o CUSTO em energia. Embaixo, o disco à esquerda é a FORÇA, que é o dano que ela causa; ' +
     'o escudo azul à direita é a DUREZA, que é o quanto ela aguenta. Sempre nos mesmos três cantos.'},
  {alvo:'[data-guia="ene"]', ico:'i-energia', t:T.energia,
   p:'{energia} paga tudo: extrair, refinar, forjar. Sobe 1 por turno até 9 e NÃO acumula — o que sobrar no fim do turno se perde.'},
  {alvo:'[data-guia="campo"]', ico:'i-pedra', t:'Seu campo',
   p:'Cabem três. A carta vira uma ficha: degrau em cima, símbolo químico no disco, {valor} à esquerda, {dureza} à direita, nome embaixo.'},
  {alvo:'[data-guia="heroi"]', ico:'i-escudo', t:'O alvo',
   p:'{geo} este escudo é a ' + T.geoLonga + ' do adversário. Arraste sua ficha até ele, ou até uma ficha inimiga. Zerou, ganhou.'},
  {alvo:'[data-guia="refinar"]', ico:'i-refinar', t:'Refinar',
   p:'{refinar} toda carta entra como concentrado. Refinar sobe um degrau, dá mais {valor} e mais {dureza}, e faz a carta virar BARREIRA. Dá para atacar e refinar no mesmo turno.'},
  {alvo:'[data-guia="campo"]', ico:'i-barreira', t:'Barreira',
   p:'{barreira} carta refinada trava a passagem: enquanto ela estiver no campo, é o único alvo. Concentrado bruto não defende ninguém.'},
  {alvo:'[data-guia="forjar"]', ico:'i-liga', t:'Ligas',
   p:'{liga} o degrau de cima. Duas substâncias JÁ REFINADAS viram uma liga real. O painel mostra o que falta refinar.'},
  {alvo:'[data-guia="maoop"]', ico:'i-mao', t:'A mão dele',
   p:'As cartas viradas mostram quantas cartas o adversário tem. Só a quantidade.'},
  {alvo:'[data-guia="relogio"]', ico:'i-encerrar', t:'O relógio',
   p:'Noventa segundos por turno. Acabou o tempo, o turno passa sozinho.'}
];
let guiaPasso = -1;
const jaViu = () => { try{ return localStorage.getItem('minerais.tutorial') === '9'; }catch(e){ return false; } };
const marcarVisto = () => { try{ localStorage.setItem('minerais.tutorial','9'); }catch(e){} };

function abrirGuia(i){
  guiaPasso = i;
  if(i >= GUIA.length){ fecharGuia(); marcarVisto(); return; }
  const passo = GUIA[i], alvo = document.querySelector(passo.alvo);
  if(!alvo){ abrirGuia(i + 1); return; }
  /* BUG 6 — com rolagem suave, getBoundingClientRect abaixo media a posição
     ANTES de a página terminar de rolar, e o holofote ficava fora de lugar.
     Rolagem instantânea resolve, e o reposicionamento em scroll/resize cobre
     o resto. */
  if(alvo.scrollIntoView) alvo.scrollIntoView({block:'center', behavior:'auto'});

  let blq = $('tutorBloqueio'), hol = $('holofote'), bal = $('balao');
  if(!blq){
    blq = document.createElement('div'); blq.id = 'tutorBloqueio'; document.body.appendChild(blq);
    hol = document.createElement('div'); hol.id = 'holofote';      document.body.appendChild(hol);
    bal = document.createElement('div'); bal.id = 'balao'; bal.className = 'pnl';
    document.body.appendChild(bal);
  }
  const r = alvo.getBoundingClientRect(), m = 8;
  hol.style.left = (r.left - m) + 'px'; hol.style.top = (r.top - m) + 'px';
  hol.style.width = (r.width + m*2) + 'px'; hol.style.height = (r.height + m*2) + 'px';
  bal.innerHTML = '<span class="passo">Passo ' + (i+1) + ' de ' + GUIA.length + '</span>' +
    '<h4>' + (passo.ico ? '<svg class="ic"><use href="#' + passo.ico + '"/></svg>' : '') +
      passo.t + '</h4><p>' + comIcones(passo.p) + '</p><div class="nav">' +
    '<span class="pontos">' + GUIA.map((_,k)=>'<i class="'+(k===i?'on':'')+'"></i>').join('') + '</span>' +
    '<span style="display:flex;gap:6px"><button class="b peq fantasma" id="gPular">Pular</button>' +
    '<button class="b peq" id="gProx">' + (i === GUIA.length-1 ? 'Jogar' : 'Próximo') + '</button></span></div>';

  /* posiciona o balão FORA do retângulo destacado: abaixo, senão acima,
     senão ao lado. Era isto que cobria as primeiras cartas da mão. */
  const larg = 300, alt = bal.offsetHeight || 180, folga = 14;
  let x = Math.min(Math.max(12, r.left), innerWidth - larg - 12);
  let y;
  if(r.bottom + folga + alt < innerHeight - 12)      y = r.bottom + folga;
  else if(r.top - folga - alt > 12)                  y = r.top - folga - alt;
  else { y = Math.max(12, (innerHeight - alt) / 2);
         x = (r.left > innerWidth / 2) ? Math.max(12, r.left - larg - folga)
                                       : Math.min(innerWidth - larg - 12, r.right + folga); }
  bal.style.left = x + 'px'; bal.style.top = y + 'px';

  bal.querySelector('#gProx').onclick = () => abrirGuia(i + 1);
  bal.querySelector('#gPular').onclick = () => { fecharGuia(); marcarVisto(); };
  bal.querySelector('#gProx').focus();
}
function fecharGuia(){
  guiaPasso = -1;
  ['tutorBloqueio','holofote','balao'].forEach(i => { const e = $(i); if(e) e.remove(); });
}
const reposicionarGuia = () => { if(guiaPasso >= 0) abrirGuia(guiaPasso); };
addEventListener('resize', reposicionarGuia);
addEventListener('scroll', reposicionarGuia, true);

/* ---------- ligações ---------- */
$('btnForjar').onclick  = () => painelAberto === 'liga'   ? fecharPainel() : abrirPainel('liga');
$('btnRefinar').onclick = () => painelAberto === 'refino' ? fecharPainel() : abrirPainel('refino');
const btnPeD = $('btnPeD');
if(btnPeD) btnPeD.onclick = () => painelAberto === 'ped' ? fecharPainel() : abrirPainel('ped');

/* Gatilhos de abandono: fechar a aba, trocar de app, bloquear a tela.
   `temPartida` evita registrar uma partida que já acabou ou nem começou. */
if(typeof Telemetria !== 'undefined')
  Telemetria.ligar(montarRegistro, () => est && est.fim === null && est.turno > 2);

$('btnNovo').onclick    = novaPartida;
/* Sair da partida. Confirma só se a partida está em andamento — perguntar
   "tem certeza?" numa partida que acabou de começar é atrito à toa. */
const btnSair = $('btnSair');
if(btnSair) btnSair.onclick = () => {
  const emJogo = est && est.fim === null && est.turno > 2;
  if(emJogo && !confirm('Sair da partida? O que foi jogado se perde.')) return;
  if(emJogo && typeof Telemetria !== 'undefined')
    Telemetria.registrar(montarRegistro, 'abandono');
  location.href = 'inicio.html';
};
/* REGISTRO NO CELULAR. A coluna da esquerda não cabe numa tela deitada de
   360 px de altura, então ela vira botão. O `#log` é MOVIDO para dentro da
   tela (não copiado): assim continua sendo o mesmo elemento que o
   `desenhar()` atualiza, e não existem duas listas para manter em dia. */
const btnRegistro = $('btnRegistro');
if(btnRegistro) btnRegistro.onclick = () => {
  const casa = $('log').parentElement;
  const d = tela('<div class="ajuda"><h2>Registro</h2><div id="ondeLog"></div>' +
    '<div class="acoes"><button class="b" id="guardaR">Guardar partida</button>' +
    '<button class="b" id="fechaR">Fechar</button></div></div>', 'largo');
  d.querySelector('#ondeLog').appendChild($('log'));
  const devolver = () => { casa.prepend($('log')); fecharTelas(); };
  d.querySelector('#fechaR').onclick = devolver;
  d.querySelector('#guardaR').onclick = guardarPartida;
  d.addEventListener('click', e => { if(e.target === d) devolver(); });
};

$('btnAjuda').onclick   = telaAjuda;
$('btnGuardar').onclick = guardarPartida;
$('btnSom').onclick      = alternarSom;
/* ESTE ERA O BUG DO "PASSE O APARELHO".

   O botão de encerrar o turno abria a tela SEM CONDIÇÃO NENHUMA, então ela
   aparecia toda vez — inclusive contra o computador, onde não há aparelho
   para passar e a mão do bot nunca esteve visível.

   Eu tinha "consertado" só o caminho do relógio (linha ~906), depois de um
   grep que voltou incompleto e me fez concluir que não havia outro
   chamador. Havia: este. Lição repetida — conclusão tirada de busca não é
   verificação. */
$('btnPassar').onclick  = () => {
  if(agir({tipo:'passar'}) && est.fim === null && MODO === 'dupla') telaPassagem();
};
addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  if($('telas').firstChild && !$('telas').querySelector('.fim')){ fecharTelas(); return; }
  if(painelAberto){ fecharPainel(); return; }
  if(sel !== null){ sel = null; desenhar(); }
});

console.log('Minerais do Brasil — mesa ' + VERSAO + ' · motor v' + Motor.versao +
            ' · ' + DADOS.cartas.length + ' cartas');
montarDicas();
prepararSom();
iniciarSom();
novaPartida();
if(!jaViu()) setTimeout(() => abrirGuia(0), 550);
