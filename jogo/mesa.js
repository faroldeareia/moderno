/* VERSÃO DA MESA: v10 (2026-08-06)
   motor: engine-v7.js · dados: dados.js (gerado da planilha)

   A partir da v10 o arquivo NÃO carrega mais o número no nome. Com a
   interface separada em três arquivos (jogo.html, estilo.css, mesa.js),
   versionar cada um daria jogo-v10.html + estilo-v10.css + mesa-v10.js,
   e bastaria esquecer um para o conjunto ficar inconsistente. Então:

     jogo.html, estilo.css, mesa.js   sempre a versão atual
     versoes/jogo-vN.html             fotografias antigas, arquivo único
     engine-vN.js                     o motor CONTINUA versionado, porque
                                      registro de partida antigo precisa
                                      do motor da época para reproduzir

   O número da versão vive aqui em cima e sai no console ao abrir.

/* Interface do Jogo de Cartas Minerais — hot-seat, dois jogadores no
   mesmo aparelho.

   Aqui NÃO há regra de jogo: quem decide é engine-v7.js. Este arquivo
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

const COR = {
  I:  {c:'var(--b1)', s:'var(--b1s)', nome:'Bloco I — dependência de importação', chave:'DEPENDÊNCIA DE IMPORTAÇÃO'},
  II: {c:'var(--b2)', s:'var(--b2s)', nome:'Bloco II — aplicação tecnológica',    chave:'APLICAÇÃO TECNOLÓGICA'},
  III:{c:'var(--b3)', s:'var(--b3s)', nome:'Bloco III — superávit comercial',     chave:'SUPERÁVIT COMERCIAL'}
};

/* ============================================================
   SLOTS DE ARTE — nada aqui é obrigatório. Cada imagem que
   existir entra sozinha; o que não existir usa o desenho em CSS.
     arte/01.jpg … arte/25.jpg    arte de cada carta (4:3)
     mesa/fundo.jpg               cenário da tela inteira
     mesa/mesa.jpg                tampo da arena (opcional)
     mesa/verso.jpg               verso da carta
     avatares/01.png … 04.png     avatar do jogador
   ============================================================ */
/* ------------------------------------------------------------
   ARTE — três formas e três estados, com queda suave.

   FORMAS    'retrato'  carta da mão e carta grande, recorte 4:3
             'ficha'    disco do tabuleiro, recorte circular

   ESTADOS   concentrado · refinado · liga

   O jogo tenta os arquivos NA ORDEM abaixo e usa o primeiro que
   existir. Ou seja: você pode desenhar só `arte/07.jpg` e tudo
   funciona; desenhar `07-ficha.jpg` melhora o disco; desenhar
   `07-refinado.jpg` faz a carta mudar ao subir de degrau. Nada
   é obrigatório e nada quebra se faltar.
   ------------------------------------------------------------ */
const NN = id => String(id).padStart(2,'0');
const slug = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function caminhosArte(c, b, forma){
  const fichaP = forma === 'ficha';
  if(c.liga){
    const g = 'ligas/' + slug(c.liga);
    return fichaP ? [g + '-ficha.jpg', g + '.jpg'] : [g + '.jpg'];
  }
  if(!b || !b.id) return [];
  const n = NN(b.id), refinada = (c.nivel || 0) >= 1;
  const lista = [];
  if(refinada){
    if(fichaP) lista.push('arte/' + n + '-refinado-ficha.jpg');
    lista.push('arte/' + n + '-refinado.jpg');
  }
  if(fichaP) lista.push('arte/' + n + '-ficha.jpg');
  lista.push('arte/' + n + '.jpg');
  return lista;
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

const ARTE = id => 'arte/' + NN(id) + '.jpg';   // compatibilidade
function seExistir(url, aoCarregar){
  const i = new Image(); i.onload = () => aoCarregar(url); i.src = url;
}
const raiz = document.documentElement;
seExistir('mesa/fundo.jpg', u => raiz.style.setProperty('--cenario','url(' + u + ')'));
seExistir('mesa/mesa.jpg',  u => { raiz.style.setProperty('--tampo','url(' + u + ')');
                                   document.getElementById('arena').classList.add('transp'); });
seExistir('mesa/verso.jpg', u => raiz.style.setProperty('--verso','url(' + u + ')'));

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

/* O raio dentro do disco é o que diz "isto é energia" sem legenda. */
const hexEnergia = n =>
  '<span class="badge ene"><span class="raio"><svg class="ic"><use href="#i-energia"/></svg></span>' +
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
  energia:  ['Energia', 'Paga extração, refino e forja. Sobe 1 por turno até 9 e NÃO acumula entre os turnos.'],
  maoOp:    ['Mão do adversário', 'Quantas cartas o seu adversário tem.'],
  relogio:  ['Tempo do turno', 'Tempo máximo para realizar as jogadas.'],
  encerrar: ['Encerra o turno', 'Passa a vez. A energia que sobrou se perde e suas cartas acordam para o próximo turno.'],
  forjar:   ['Forjar liga', 'O número ao lado é quantas ligas dá para forjar agora, não o preço. Só é possível forjar cartas refinadas. Forjar aumenta ainda mais os atributos dela.'],
  refinar:  ['Refinar / P&D', 'O número ao lado é quantas cartas dá para refinar agora. Refinar no campo a transforma em barreira. Refinar na mão (P&D) melhora os status para quando ela entrar.'],
  registro: ['Registro', 'Tudo que aconteceu. O botão guarda um arquivo com a semente e as jogadas.'],
  avatar:   ['Adversário', 'O seu adversário.'],
  degrau:   ['Degrau da cadeia', 'Concentrado é o que se exporta cru e vale pouco. Refinado vale mais. Liga é o topo, neste jogo.'],
  barreira: ['Barreira', 'Toda carta REFINADA trava a passagem. Enquanto uma delas estiver no campo, só ela pode ser atacada.'],
  mohs:     ['Dureza Mohs', 'A dureza do mineral de referência, de 1 (talco) a 10 (diamante). É a resistência da carta.'],
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
   Comece pelos nomes abaixo; o que não existir é simplesmente
   ignorado, sem erro no console.

   Começa MUDA de propósito: navegador não deixa tocar áudio antes
   de um gesto do usuário, e estande de feira já é barulhento.
   O botão SOM no topo liga, e a partir daí as faixas se revezam
   em laço com uma transição curta entre elas.
   ============================================================ */
/* ------------------------------------------------------------
   SOM — arquivos em audio/. Ver audio/LEIA-ME.md.

   Os nomes vão SEM extensão. O jogo pergunta ao navegador o que ele
   sabe tocar e procura nessa ordem: .ogg, .mp3, .wav. Assim você
   publica em ogg (3 MB) em vez de wav (30 MB) sem tocar no código, e
   quem tiver só o wav continua funcionando.
   ------------------------------------------------------------ */
const FORMATOS = ['.ogg', '.mp3', '.wav'];
const TRILHAS = ['audio/trilha1', 'audio/trilha2', 'audio/trilha3'];
const VOLUME_TRILHA = 0.40;

const SONS = {
  passarTurno:   ['audio/turno',         0.55],
  jogarCarta:    ['audio/extrair',       0.60],
  refinar:       ['audio/refinar',       0.60],
  forjarLiga:    ['audio/forjar',        0.70],
  atacarCarta:   ['audio/ataque-carta',  0.60],
  atacarHeroi:   ['audio/ataque-escudo', 0.70],
  fimPartida:    ['audio/fim',           0.75],
  tempoAcabando: ['audio/tempo',         0.50],
  comprarCarta:  ['audio/comprar',       0.35],
  cartaEsgotada: ['audio/esgotou',       0.55],
  ligaDisponivel:['audio/liga-pronta',   0.45],
  especulacao:   ['audio/especulacao',   0.55],
  exaustao:      ['audio/exaustao',      0.60],
  jogadaInvalida:['audio/nao',           0.40],
  barreira:      ['audio/barreira',      0.55]
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
   COMEÇA LIGADO. O botão continua existindo porque estande de feira é
   barulhento e quem demonstra às vezes quer só os efeitos — mas a
   escolha padrão passou a ser tocar. */
const som = { nivel:2, faixas:[], atual:0, efeitos:{}, destravado:false };
const VOZES = 3;

function prepararSom(){
  TRILHAS.forEach(base => {
    const a = novoAudio(base, VOLUME_TRILHA);
    a.preload = 'auto';
    a.addEventListener('ended', () => { if(som.nivel === 2) proximaFaixa(); });
    som.faixas.push(a);
  });
  Object.keys(SONS).forEach(nome => {
    const [base, vol] = SONS[nome];
    som.efeitos[nome] = { i:0, vozes: Array.from({length:VOZES}, () => novoAudio(base, vol)) };
  });
}

/* Navegador nenhum deixa tocar áudio antes de um gesto do usuário — é
   regra da plataforma, não escolha nossa. Então: tenta tocar na hora; se
   for barrado, engata no primeiro clique ou tecla que acontecer. Do ponto
   de vista de quem joga, a música começa sozinha. */
function destravarNoPrimeiroGesto(){
  if(som.destravado) return;
  const engatar = () => {
    som.destravado = true;
    removeEventListener('pointerdown', engatar);
    removeEventListener('keydown', engatar);
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
  try { a.currentTime = 0; a.play().catch(() => {}); } catch(err){}
}
function proximaFaixa(){
  const boas = som.faixas.filter(a => !a.quebrada);
  if(!boas.length) return;
  som.atual = (som.atual + 1) % boas.length;
  const a = boas[som.atual];
  a.currentTime = 0;
  a.play().then(() => { som.destravado = true; })
          .catch(() => destravarNoPrimeiroGesto());
}
function pararTrilha(){ som.faixas.forEach(a => { try{ a.pause(); }catch(e){} }); }
function alternarSom(){
  som.nivel = (som.nivel + 1) % 3;
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

let est, sel = null, painelAberto = null;
let vistas = new Set(), geoAnterior = [null,null];
let segundos = SEG_TURNO;
const $ = id => document.getElementById(id);
const base = id => DADOS.cartas.find(c => c.id === id) || {};
const blocoDe = c => COR[c.bloco] || COR.II;
const simboloDe = (c,b) => c.liga ? '⚒' : (SIGLA[b.elemento] || b.elemento || '?');

/* ============================================================
   PARTIDA
   ============================================================ */
function novaPartida(){
  est = Motor.novoJogo(DADOS, (Math.random()*1e9)|0);
  sel = null; painelAberto = null;
  vistas = new Set(); geoAnterior = [null,null];
  fecharTelas(); fecharPainel(); montarAvatares(); reiniciarRelogio(); desenhar();
}
function agir(acao){
  const antesLog = est.log.length;
  const antesLigas = Motor.ligasDisponiveis(est, DADOS).length;
  const r = Motor.aplicar(est, DADOS, acao);
  if(!r.ok){ tocar(/barreira/i.test(r.erro) ? 'barreira' : 'jogadaInvalida'); aviso(r.erro); return false; }

  sonsDaJogada(acao, est.log.slice(antesLog));
  sel = null; fecharPainel();
  if(acao.tipo === 'passar') reiniciarRelogio();
  desenhar();
  // o botão de liga acabou de acender? avisa com som, é o que ensina a escada
  if(Motor.ligasDisponiveis(est, DADOS).length > antesLigas) tocar('ligaDisponivel');
  if(est.fim !== null) tocar('fimPartida');
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
  [['avatarEu',0],['avatarOp',1]].forEach(([id, i]) => {
    const el = $(id);
    const n = ((est.semente >> (i * 3)) % 4) + 1;
    el.textContent = String(i + 1);
    seExistir('avatares/' + String(n).padStart(2,'0') + '.png',
      u => { el.innerHTML = ''; const im = new Image(); im.alt=''; im.src = u; el.appendChild(im); });
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

function guardarPartida(){
  const reg = { versaoMotor: Motor.versao, dados: assinaturaDados(),
                quando: new Date().toISOString(),
    semente: est.semente, cfg: est.cfg, turnos: est.turno, fim: est.fim,
    acoes: est.acoes, log: est.log };
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
setInterval(() => {
  if(!est || est.fim !== null) return;
  if($('telas').firstChild || $('balao')) return;
  segundos--;
  if(segundos === 10) tocar('tempoAcabando');   // toca uma vez, a 10 segundos do fim
  if(segundos <= 0){
    aviso('Tempo esgotado — turno encerrado.');
    agir({tipo:'passar'});
    if(est.fim === null) telaPassagem();
    return;
  }
  pintarRelogio();
}, 1000);

/* ============================================================
   FICHA — degrau em cima, disco, nome embaixo
   ============================================================ */
function fichaEl(c, meu){
  const b = base(c.cartaId), bl = blocoDe(c);
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'f' + (meu ? ' meu' : ' op') + ' n' + (c.nivel || 0)
               + (c.barreira ? ' barreira' : '')
               + (meu && !c.pronta ? ' dorme' : '') + (sel === c.uid ? ' sel' : '')
               + (vistas.has(c.uid) ? '' : ' entra');
  vistas.add(c.uid);
  el.style.setProperty('--cor', bl.c); el.style.setProperty('--corS', bl.s);
  if(!meu){ el.dataset.drop = 'ficha'; el.dataset.uid = c.uid; }   // alvo de arrasto

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
    (meu && !c.pronta ? '. Descansando.' : ''));
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

  let seloHtml = '';
  if(c.nivel >= 1) {
    seloHtml = '<span class="selo barreiraSelo" style="background:var(--ouroEsc);color:#fff" data-dica="barreira">P&D (REFINADO)</span>';
  } else if(est && est.cfg.barreiraPorRefino) {
    seloHtml = '<span class="selo viraBarreira" data-dica="barreira">vira barreira</span>';
  } else if(b.defesa >= (est ? (est.cfg.barreiraDureza ?? 99) : 99)) {
    seloHtml = '<span class="selo barreiraSelo" data-dica="barreira">barreira</span>';
  }

  el.innerHTML =
    hexEnergia(c.custo) +
    '<span class="badge sim' + (simbolo.length > 2 ? ' peq' : '') + '">' + esc(simbolo) + '</span>' +
    '<span class="badge val">' + c.ataque + '</span>' +
    '<span class="badge dur">' + dureza + '</span>' +
    '<span class="tit"><span class="n">' + esc(curto(c.nome)) + '</span>' +
      '<span class="sub">' + esc(acentuar(b.mineral || '')) + '</span></span>' +
    '<span class="lugarArte"></span>' +
    seloHtml +
    '<span class="mohs" data-dica="mohs">' + Array.from({length:10},(_,i)=>'<i class="'+(i<Math.round(dureza)?'on':'')+'"></i>').join('') + '</span>';

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
    sub = c.partes.map(curto).join(' + ');
    desc = 'Vale e resiste pelo conjunto das peças. É o degrau de cima da cadeia.';
    frase = lg ? acentuar(lg.ensina) : '';
  } else {
    chave = bl.chave;
    sub = acentuar(b.mineral || '');
    desc = 'Mineral de referência: <b>' + esc(acentuar(b.mineral)) + '</b>' +
           (b.formula ? ' (' + esc(b.formula) + ')' : '') + '. Dureza Mohs ' +
           String(b.mohs).replace('.',',') + '.';
    /* frase de efeito: sai da coluna `frase` da planilha quando existir.
       Até lá entra a nota técnica da carta — nada inventado. */
    frase = acentuar(semJargao(b.frase || b.nota || ''));
  }
  const p = $('previa');
  p.innerHTML =
    '<div class="pc" style="--cor:' + bl.c + ';--corS:' + bl.s + '">' +
      hexEnergia(c.liga ? 0 : c.custo) +
      '<span class="badge sim' + (simbolo.length > 2 ? ' peq' : '') + '">' + esc(simbolo) + '</span>' +
      '<span class="badge val">' + c.ataque + '</span>' +
      '<span class="badge dur">' + dureza + '</span>' +
      '<div class="dentro">' +
        '<div class="cab"><h4>' + esc(curto(c.nome)) + '</h4><span class="chip">' + esc(sub) + '</span></div>' +
        '<div class="quadro" id="quadroPrevia"><span class="vazio"><svg class="ic"><use href="#i-pedra"/></svg></span></div>' +
        '<div class="mohsP">' + Array.from({length:10},(_,i)=>'<i class="'+(i<Math.round(dureza)?'on':'')+'"></i>').join('') + '</div>' +
        '<div class="caixa"><div class="chave">' + esc(chave) + '</div>' +
          '<p class="desc">' + desc + '</p>' +
          (frase ? '<hr><p class="frase">' + esc(frase) + '</p>' : '') + '</div>' +
        '<div class="rodape"><span><svg class="ic"><use href="#i-dureza"/></svg>' +
          (c.liga ? 'LIGA' : String(b.id).padStart(3,'0') + '/025') + ' · ' +
          esc(nomeNivel(c).toUpperCase()) +
          (b.duplo === 'III' ? ' · SUPERÁVIT' : '') +
          (b.oficial === 'COMPLEMENTAR' ? ' · COMPLEMENTAR' : '') + '</span></div>' +
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
    const x0 = ev.clientX, y0 = ev.clientY;
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
    }
    function soltar(e){
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
      try { el.releasePointerCapture(e.pointerId); } catch(err){}
      if(!ativo) return;                     // foi clique: deixa o click acontecer
      if(fantasma) fantasma.remove();
      el.classList.remove('arrastando');
      document.body.classList.remove('arrastandoAlgo','arr-mao','arr-ficha');
      if(ultimo) ultimo.classList.remove('sobre');
      const z = zonaSob(e.clientX, e.clientY, carga);
      dlog('soltou em', e.clientX, e.clientY, '-> zona =', z ? z.dataset.drop : 'NENHUMA',
           '| por cima estava:', (document.elementFromPoint(e.clientX, e.clientY) || {}).className);
      if(!z) return;
      if(carga.tipo === 'mao'   && z.dataset.drop === 'campo') agir({tipo:'jogar', uid:carga.uid});
      if(carga.tipo === 'ficha' && z.dataset.drop === 'heroi') agir({tipo:'atacar', uid:carga.uid, alvo:'reserva'});
      if(carga.tipo === 'ficha' && z.dataset.drop === 'ficha') agir({tipo:'atacar', uid:carga.uid, alvo:+z.dataset.uid});
    }
    el.addEventListener('pointermove', mover, {passive:false});
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
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
  // rede de segurança geométrica
  const m = 6;   // tolerância: perdoa a mão trêmula na borda
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
  const eu = est.jogadores[est.vez], op = est.jogadores[1 - est.vez];

  $('pino').textContent = est.vez + 1;
  $('quem').textContent = T.jogadores[est.vez];
  $('turnoTxt').textContent = 'Turno ' + est.turno;
  $('meuNome').textContent = T.jogadores[est.vez];
  $('opNome').textContent  = T.jogadores[1 - est.vez];
  ['capEu','capOp'].forEach(i => $(i).textContent = T.geo);
  ['rotResEu','rotResOp'].forEach(i => $(i).textContent = T.reservas);
  $('meuGeo').textContent = eu.reserva;
  $('opGeo').textContent  = op.reserva;
  $('meuRes').textContent = eu.baralho.length;
  $('opRes').textContent  = op.baralho.length;
  $('meuEne').textContent = eu.energia;
  $('subMao').textContent = eu.mao.length + (eu.mao.length === 1 ? ' carta' : ' cartas');

  if(geoAnterior[1 - est.vez] !== null && op.reserva < geoAnterior[1 - est.vez]) sacode($('heroiOp'));
  geoAnterior[est.vez] = eu.reserva; geoAnterior[1 - est.vez] = op.reserva;

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
    zEu.innerHTML = '<p class="dica">Campo vazio. Arraste uma carta da mão para cá — ou clique nela.</p>';
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
    el.disabled = semEnergia || (semEspaco && c.nivel === 0);
    el.title = (semEspaco && c.nivel === 0) ? 'Campo cheio'
             : semEnergia ? 'Faltam ' + (c.custo - eu.energia) + ' de energia'
             : 'Extrair por ' + c.custo + ' de energia';
    el.onclick = () => agir({tipo:'jogar', uid:c.uid});
    if(!el.disabled) arrastavel(el, {tipo:'mao', uid:c.uid});
    zm.appendChild(el);
  });

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
    $('contPeD').hidden = !podePeD.length;
    $('contPeD').textContent = '×' + podePeD.length;
  }

  const bf = $('btnForjar');
  bf.disabled = !(ligas.length || quase.length);
  bf.classList.toggle('acesa', ligas.length > 0);
  $('contLigas').hidden = !ligas.length;
  $('contLigas').textContent = '×' + ligas.length;
  
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
function abrirPainel(qual){
  painelAberto = qual;
  const eu = est.jogadores[est.vez];
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
    if(!ligas.length && !quase.length){ fecharPainel(); return; }
    html = '<h3><span>Forjar liga — o degrau de cima</span><button class="b peq fantasma" id="fechaP">Fechar</button></h3>';
    corpo = quase.map(q =>
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
    '<button class="b" id="guarda"><svg class="ic"><use href="#i-baixar"/></svg>Guardar</button></div>', 'fim');
  d.querySelector('#denovo').onclick = novaPartida;
  d.querySelector('#guarda').onclick = guardarPartida;
}
function telaAjuda(){
  const cfg = est ? est.cfg : Motor.PADRAO;
  const d = tela('<div class="ajuda"><h2>Como jogar</h2>' +
    '<p>Cada carta é uma <b>substância mineral</b> considerada crítica ou estratégica' +
      'Você vence zerando a <b>' + T.geoLonga + '</b> do adversário, representada pelo escudo dele.</p>' +
    '<h3>Os três números</h3>' +
    '<div class="atr"><span class="ico" style="background:rgba(224,160,18,.16);color:var(--energia)"><svg class="ic"><use href="#i-energia"/></svg></span>' +
      '<span><b>' + T.energia + '</b><span>Paga para extrair, refinar ou forjar. Começa em 2, sobe 1 por turno até 9, e não acumula.</span></span></div>' +
    '<div class="atr"><span class="ico" style="background:rgba(176,125,23,.2);color:#e0b642"><svg class="ic"><use href="#i-valor"/></svg></span>' +
      '<span><b>' + T.valor + '</b><span>Preço de mercado em escala logarítmica. É o dano que a carta causa.</span></span></div>' +
    '<div class="atr"><span class="ico" style="background:rgba(59,110,165,.24);color:#6b9dd0"><svg class="ic"><use href="#i-dureza"/></svg></span>' +
      '<span><b>' + T.dureza + '</b><span>Dureza Mohs do mineral de referência — o que o Brasil de fato lavra. É a resistência.</span></span></div>' +
    '<h3>Os dois medidores</h3><ul>' +
      '<li><b>' + T.geo + '</b> é o escudo no meio da mesa: o que você perde ao ser atingido. Zerou, perdeu.</li>' +
      '<li><b>' + T.reservas + '</b> é o que ainda há para lavrar. Quando acaba, a exaustão corrói sua ' + T.geoLonga + ' sozinha, cada vez mais rápido.</li>' +
    '</ul>' +
    '<h3>O turno</h3><ul>' +
      '<li>Arraste uma carta da mão para o seu campo, ou clique nela. Cabem ' + cfg.campoMax + '.</li>' +
      '<li>A mão de abertura sempre traz ao menos uma carta de custo ' + cfg.garantiaCusto + ' ou menos.</li>' +
      '<li>A mão vai até <b>' + cfg.maoMax + ' cartas</b>. Com a mão cheia você não compra: a carta se perde e custa ' +
        cfg.custoEspeculacao + ' de sua força geopolítica. O jogo penaliza a especulação.</li>' +
      '<li>Carta recém-extraída descansa: só ataca no turno seguinte.</li>' +
      '<li>Arraste sua carta até uma ficha inimiga ou até o escudo. Clicar também funciona.</li>' +
      '<li>Ao atingir outra ficha, as duas se machucam. Quem zera a ' + T.dureza.toLowerCase() + ' sai do jogo.</li>' +
    '</ul>' +
    '<h3>Barreira</h3>' +
    '<p>Carta <b>refinada</b> trava a passagem. Enquanto uma delas estiver no campo, ela é o ' +
      '<b>único alvo possível</b>. Assim, nem as outras cartas, nem o escudo do adversário pode ser atigindo. Para chegar na vida do ' +
      'adversário é preciso derrubar o que ele processou.</p>' +
    '<p>Concentrado bruto não defende ninguém: o que protege um país não é ter pedra no chão, é ter ' +
      '<b>capacidade instalada de processamento</b>. Toda liga também faz barreira, porque é o degrau ' +
      'mais alto da cadeia.</p>' +
    '<h3>A escada: concentrado → refinado → liga</h3>' +
    '<p>Toda carta entra como <b>concentrado</b>. são cartas que valem pouco. <b>Refinar</b> ' +
      'sobe um degrau: +' + cfg.refinoValor + ' de valor e +' + cfg.refinoDureza + ' de dureza, pagando energia. ' +
      'É sempre de uma carta sozinha, então nunca depende do outro minério.</p>' +
    '<p>Refinar <b>não gasta a ação</b>: dá para atacar e refinar a mesma carta no mesmo turno. ' +
      'A única trava é que a carta não refina no turno em que entrou no campo.</p>' +
    '<p>O bônus é <b>fixo</b>, de propósito: ferro vai de 1 para ' + (1 + cfg.refinoValor) + ', ouro de 9 para ' +
      (9 + cfg.refinoValor) + '. Quem mais ganha verticalizando é a commodity barata.</p>' +
    '<p>A <b>liga</b> é o degrau de cima e só aceita peças já refinadas. No painel, as bloqueadas dizem o que falta.</p>' +
    '<h3>As três cores</h3><div class="blocos">' +
      '<div style="border-color:var(--b1)"><b>Críticos</b> — dependência de importação: enxofre, fosfato, potássio, molibdênio.</div>' +
      '<div style="border-color:var(--b2)"><b>Tecnológicos</b> — aplicação tecnológica: lítio, terras raras, nióbio, tântalo e outras.</div>' +
      '<div style="border-color:var(--b3)"><b>Comércio</b> — superávit na balança comercial: ferro, ouro, alumínio, manganês.</div></div>'  +
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
   p:'{energia} o custo, no hexágono dourado. {valor} o valor, que é o dano que a carta causa. ' +
     '{dureza} a dureza, que é o quanto ela aguenta. Os mesmos três símbolos aparecem em toda parte.'},
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

$('btnNovo').onclick    = novaPartida;
$('btnAjuda').onclick   = telaAjuda;
$('btnGuardar').onclick = guardarPartida;
$('btnSom').onclick      = alternarSom;
$('btnPassar').onclick  = () => { if(agir({tipo:'passar'}) && est.fim === null) telaPassagem(); };
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
