/* Motor de regras — Jogo de Cartas Minerais — v7 (Atualizado com P&D)
   Puro: sem DOM, sem rede, sem Math.random.
   Roda igual no navegador (window.Motor) e no Node (require).
   O servidor usa este MESMO arquivo como fonte da verdade.

   NOVIDADE DA v3 — a escada de valor agregado:

       Concentrado  --refinar-->  Refinado  --forjar-->  Liga
        (nivel 0)                (nivel 1)              (nivel 2)

   Antes havia dois sistemas de combinacao concorrentes (jogar carta
   e forjar liga). Agora e uma escada de tres degraus so:

   - Todo mineral entra no campo como CONCENTRADO. E o que o Brasil
     exporta: valor baixo.
   - REFINAR e por carta, sozinha, sempre possivel: paga energia e
     ganha atributo. E a verticalizacao.
   - FORJAR consome varias cartas e exige que todas ja estejam
     refinadas. Nao existe liga feita de concentrado.

   Isso responde de um jeito estrutural a duvida "da para evoluir sem
   o outro minerio?": da, porque o degrau do refino e de UMA carta.
   O que precisa das duas e o degrau de cima.

   NOVIDADES DA v4:

   1. MAO DE ABERTURA GARANTIDA. A mao inicial sempre tem ao menos uma
      carta barata. Sem isso o turno 1 as vezes e um turno morto: energia
      2 e nada na mao que caiba. Turno morto no primeiro turno e o jeito
      mais rapido de perder um jogador na feira.

   2. REGISTRO DE ACOES. est.acoes guarda toda jogada aceita. Como o
      motor e deterministico e a semente esta no estado, semente + lista
      de acoes reconstroi a partida inteira. E o formato mais barato de
      guardar partida para analisar depois — e o servidor ganha de graca.

   NOVIDADES DA v5:

   3. REFINO PESA. Custava 1 de energia na carta barata e nao gastava o
      turno da carta: era refinar e atacar no mesmo turno, de graca. Agora
      o piso e 2, o ganho e menor, e refinar CONSOME A ACAO DA CARTA —
      ela nao ataca no turno em que refina, e quem ja atacou nao refina.
      Uma trava so (`pronta`) resolve as duas coisas.

   4. LIMITE DE MAO. Mao cheia nao compra: a carta se perde e custa 1 de
      forca geopolitica. E a especulacao — acumular direito de lavra sem
      lavrar tem preco. De quebra encurta a partida, que estava longa.

   NOVIDADE DA v6 — BARREIRA:

   Ate aqui nada obrigava a lidar com o tabuleiro. Bater no escudo era
   sempre a jogada mais eficiente e o campo virava decoracao: o playtest
   humano mostrou metade dos ataques indo direto na cara.

   Agora mineral DURO trava a passagem. Dureza igual ou maior que
   `barreiraDureza` (padrao 6) da BARREIRA: enquanto houver uma ficha
   com barreira no campo do adversario, so ela pode ser atacada.

   A regra nao foi inventada, foi LIDA do dado que ja existia. Quartzo,
   cassiterita e hematita seguram; silvita e grafita nao. Quem joga
   aprende a escala Mohs sem ninguem explicar — que e o mesmo padrao do
   resto do jogo, onde o rotulo ensina de graca.

   MUDANCA DA v7 — BARREIRA VEM DO REFINO, NAO DA DUREZA:

   Quem segura passa a ser quem foi REFINADO, qualquer que seja o
   mineral. Duas razoes, e a segunda e a que decide:

   1. Leitura geopolitica. O que protege um pais nao e ter pedra dura no
      chao, e ter capacidade instalada de processamento. Concentrado
      bruto nao defende ninguem.

   2. Estrutura de incentivo. Ate a v6 refinar era investimento que so
      pagava depois: +2 de valor, +1 de dureza, e talvez uma liga la na
      frente. O playtest humano mostrou o resultado — 2 refinos por
      partida, zero ligas. Virar muro paga NO MESMO TURNO. O jogador
      passa a ter motivo proprio para subir a escada, sem depender de
      ninguem explicar por que deveria.

   O que se perde, e vale registrar: a dureza deixa de ter consequencia
   mecanica propria. Ela continua sendo o numero de defesa da carta, mas
   nao decide mais quem segura. O Mohs ensinava de graca na v6.

   E REFINAR NAO GASTA MAIS A ACAO. Atacar e refinar deixaram de
   competir; so nao da para refinar a carta no turno em que ela entrou.
*/
(function (raiz) {
  'use strict';

  const PADRAO = {
    reserva: 12,             /* vida. A interface chama de "forca geopolitica".
                                Era 15. Baixou para 12 porque o refino passou a
                                competir com o ataque e a partida esticou: com 15
                                a exaustao decidia 28% das partidas. Com 12 cai
                                para 8% e a partida volta para ~15 turnos. */
    energiaInicial: 2,
    energiaMax: 9,
    baralho: 15,             // a interface chama de "reservas"
    maoInicial: 3,
    maoSegundo: 5,
    /* Compensacao unica de energia para quem joga em segundo.
       Era 1 ate a v3. Subiu para 2 na v4 e NAO foi capricho: a garantia de
       mao de abertura tirou o turno 1 morto, que na pratica era o handicap
       silencioso do primeiro jogador. Sem tocar em mais nada, a vitoria do
       primeiro pulou de 54% para 66%. Com ficha 2 volta para 52%.
       (ficha 3 inverte demais: 39%.) */
    /* Aceita numero (bonus so no 1o turno dele) ou LISTA, um valor por turno
       dele. A lista existe porque o botao inteiro e grosso demais: ficha 2
       deixa o primeiro jogador em 57%, ficha 3 joga para 37%. Nao ha inteiro
       que caia no meio. [2,1] e a meia-ficha que faltava. */
    fichaSegundo: [2, 1],

    /* A mao maior do segundo jogador SAI DE DENTRO do baralho dele: com
       baralho 15 e mao 5, ele fica com 10 na jazida contra 12 do primeiro.
       Enquanto a partida acabava por dano isso nao aparecia. Depois que o
       refino passou a competir com o ataque, a partida ficou mais longa,
       a exaustao passou a decidir 28% das partidas — e quem exaure
       primeiro perde. Resultado: o primeiro jogador ganhava 65%.
       Estas cartas a mais devolvem a jazida do segundo ao mesmo tamanho.
       Nao e presente: e correcao de uma dividа que ele estava pagando. */
    baralhoSegundoExtra: 2,
    campoMax: 3,
    bonusLiga: 4,            // Aumentado para 4: liga dá muito trabalho, a recompensa deve ser alta

    /* --- mao de abertura --- */
    garantiaCusto: 2,        // ao menos uma carta com custo <= isto na mao inicial
    garantiaMin: 1,          // quantas cartas assim garantir

    /* --- limite de mao --- */
    maoMax: 8,               // acima disso nao compra
    custoEspeculacao: 1,     // e perde isto de forca geopolitica

    /* --- escada de refino --- */
    refinoDivisor: 3,        // custo de refino = teto(custo / divisor), com piso
    refinoMin: 2,            // PISO 2: com piso 1 o refino da carta barata saia
                             // de graca e virava jogada obrigatoria todo turno.
    refinoValor: 2,          // + valor ao refinar (FIXO de proposito, ver nota abaixo)
    refinoDureza: 1,         // + dureza ao refinar
    /* v7: refinar NAO consome mais a acao. Atacar e refinar deixaram de
       competir — a unica trava que sobra e nao refinar no turno em que a
       carta entrou. Deixado configuravel para dar para voltar atras. */
    refinoGastaAcao: false,
    exigirRefinoParaLiga: true,

    /* --- barreira ---
       Dois criterios possiveis, os dois numericos para caberem na aba
       Parametros da planilha:
         barreiraPorRefino  1 = toda carta refinada (ou liga) segura
         barreiraDureza     N = segura quem tem defesa >= N (criterio da v6)
       Valem juntos se os dois estiverem ligados. Ambos vazios desligam. */
    barreiraPorRefino: 1,
    barreiraDureza: null,
    /* Quantas pecas da liga precisam estar refinadas.
       null = todas (o padrao da v5).
       1    = basta uma, o que mantem o degrau obrigatorio mas corta o
              preparo pela metade.
       Existe porque o playtest humano mostrou que "todas" tornou liga
       inalcancavel: 0 em 3 partidas. Ver ANALISE-PLAYTEST.md. */
    ligaRefinadasMin: null,

    /* Peca vinda da MAO paga so a extracao, sem o pedagio do refino.
       Com o pedagio, 20 das 21 ligas passam do teto de 9 de energia —
       ou seja, sao impossiveis por esse caminho, nao caras. */
    refinoGratisNaMao: true  // Alterado para true para habilitar combos diretos da mão
  };

  /* Nota sobre refinoValor ser fixo e nao proporcional:
     bonus fixo favorece proporcionalmente o minerio barato. Ferro sai de
     valor 1 para 4; ouro sai de 9 para 12. E exatamente a tese de politica
     mineral que o jogo quer ensinar — quem ganha com verticalizacao e a
     commodity de baixo valor unitario, nao o metal que ja e caro na mina. */

  const NIVEL = { CONCENTRADO: 0, REFINADO: 1, LIGA: 2 };

  /* Unico lugar que decide quem segura. Chamado na criacao, no refino e
     na forja — se ficasse espalhado, uma das tres esqueceria de atualizar
     e apareceria muro fantasma. */
  function calcularBarreira(cfg, nivel, defesaBase) {
    if (cfg.barreiraPorRefino && nivel >= NIVEL.REFINADO) return true;
    if (cfg.barreiraDureza != null && defesaBase >= cfg.barreiraDureza) return true;
    return false;
  }

  /* ---------- utilidades ---------- */

  // PRNG com semente: mesma semente = mesma partida.
  // Necessário para o servidor poder revalidar qualquer jogada.
  function rng(semente) {
    let a = semente >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function embaralhar(lista, rand) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // "Minério de Ferro" -> "ferro"; "Minérios do grupo da platina" -> "platina"
  function chave(nome) {
    return nome
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/^minerios? do grupo da /, '')
      .replace(/^minerios? de /, '')
      .trim();
  }

  function cartaBase(dados, cartaId) {
    return dados.cartas.find(function (c) { return c.id === cartaId; });
  }

  /* Custo de refinar uma carta.
     A planilha manda: se a coluna `refinoCusto` existir na carta, ela vence.
     Isso e o gancho para as cadeias reais (uranio, terras raras) virem da
     planilha depois, sem tocar no motor. */
  function custoRefino(est, dados, c) {
    if (c.nivel !== NIVEL.CONCENTRADO) return null;
    const b = cartaBase(dados, c.cartaId);
    if (b && b.refinoCusto != null && b.refinoCusto !== '') return Number(b.refinoCusto);
    return Math.max(est.cfg.refinoMin, Math.ceil(c.custo / est.cfg.refinoDivisor));
  }

  /* ---------- montagem ---------- */

  function montarPool(cartas) {
    const pool = [];
    cartas.forEach(function (c) {
      for (let i = 0; i < c.copias; i++) pool.push(c.id);
    });
    return pool;
  }

  function novoJogo(dados, semente, cfg) {
    /* Ordem de precedencia dos numeros:
         PADRAO do motor  <  dados.regras (aba Parametros da planilha)  <  cfg
       A planilha manda; o PADRAO daqui e so rede de seguranca para quando a
       linha nao existir la. Antes reserva/baralho viviam nos dois lugares e
       ja tinham divergido: planilha dizia 15, motor usava 12. */
    const o = Object.assign({}, PADRAO, (dados && dados.regras) || {}, cfg || {});
    const rand = rng(semente);
    const pool = embaralhar(montarPool(dados.cartas), rand);

    if (pool.length < o.baralho * 2 + o.baralhoSegundoExtra) {
      throw new Error('Pool menor que os dois baralhos: ' + pool.length);
    }

    // Contador unico da partida. Ficava em duas variaveis diferentes e
    // cartas compradas colidiam de uid com ligas forjadas.
    const contador = { n: 0 };
    function instanciar(cartaId) {
      const base = cartaBase(dados, cartaId);
      return {
        uid: ++contador.n,
        cartaId: cartaId,
        nome: base.nome,
        bloco: base.bloco,
        custo: base.custo,
        ataque: base.ataque,
        defesa: base.defesa,
        defesaMax: base.defesa,
        nivel: NIVEL.CONCENTRADO,
        barreira: calcularBarreira(o, NIVEL.CONCENTRADO, base.defesa),
        estreouNoTurno: null,   // turno em que a carta pisou no campo
        pronta: false,     // entrou neste turno? não ataca
        liga: null,        // nome da liga, se for carta fundida
        partes: []         // nomes dos minerais fundidos
      };
    }

    const custoDoId = function (id) { return cartaBase(dados, id).custo; };
    const eBarata = function (id) { return custoDoId(id) <= o.garantiaCusto; };

    /* GARANTIA EM DOIS NIVEIS.

       Nivel 1, o baralho: com 71 cartas no pool e so 11 copias custando 2
       ou menos, um baralho de 15 as vezes sai SEM nenhuma carta barata.
       Nenhum embaralhamento da mao resolve isso. Entao primeiro trocamos
       com o resto do pool que ficou de fora (pool tem 71, os dois baralhos
       usam 30).

       Nivel 2, a mao: com o baralho ja garantido, se a mao inicial mesmo
       assim nao pegou a carta barata, troca a mais cara da mao por ela.

       Tudo deterministico: mesma semente, mesmas trocas. */
    const tamanhos = [o.baralho, o.baralho + o.baralhoSegundoExtra];
    let corte = 0;
    const fatias = tamanhos.map(function (t) { const f = pool.slice(corte, corte + t); corte += t; return f; });
    const sobra = pool.slice(corte);

    function garantirBaralho(fatia) {
      if (fatia.some(eBarata)) return fatia;
      const iSobra = sobra.findIndex(eBarata);
      if (iSobra < 0) return fatia;            // pool inteiro sem carta barata: nada a fazer
      const d = fatia.slice();
      let iCara = 0;
      for (let k = 1; k < d.length; k++) if (custoDoId(d[k]) > custoDoId(d[iCara])) iCara = k;
      const tmp = d[iCara];
      d[iCara] = sobra[iSobra];
      sobra[iSobra] = tmp;                     // devolve para a sobra, sem duplicar carta
      return d;
    }

    function garantirAbertura(fatia, quantas) {
      const mao = fatia.slice(0, quantas);
      const resto = fatia.slice(quantas);
      let baratas = mao.filter(eBarata).length;

      while (baratas < o.garantiaMin) {
        const iResto = resto.findIndex(eBarata);
        if (iResto < 0) break;                    // baralho sem carta barata sobrando
        let iCara = 0;
        for (let k = 1; k < mao.length; k++) if (custoDoId(mao[k]) > custoDoId(mao[iCara])) iCara = k;
        const tmp = mao[iCara]; mao[iCara] = resto[iResto]; resto[iResto] = tmp;
        baratas++;
      }
      return mao.concat(resto);
    }

    const jogadores = [0, 1].map(function (i) {
      const quantas = i === 0 ? o.maoInicial : o.maoSegundo;
      const fatia = garantirAbertura(garantirBaralho(fatias[i]), quantas);
      return {
        reserva: o.reserva,
        energia: 0,
        energiaMax: 0,
        baralho: fatia.slice(quantas),
        mao: fatia.slice(0, quantas).map(instanciar),
        campo: [],
        exaustao: 0,
        turnosJogados: 0
      };
    });

    const est = {
      cfg: o,
      semente: semente,
      vez: 0,
      turno: 0,
      jogadores: jogadores,
      log: [],
      acoes: [],        // semente + acoes = partida inteira reconstruivel
      fim: null,
      _contador: contador,
      _instanciar: null
    };
    est._instanciar = instanciar;
    iniciarTurno(est, dados);
    return est;
  }

  /* ---------- turno ---------- */

  function iniciarTurno(est, dados) {
    const j = est.jogadores[est.vez];
    est.turno++;
    j.energiaMax = Math.min(
      est.cfg.energiaMax,
      Math.max(j.energiaMax + 1, est.cfg.energiaInicial)
    );
    j.energia = j.energiaMax;
    // Ficha de compensacao para quem joga em segundo.
    if (est.vez === 1) {
      const f = est.cfg.fichaSegundo;
      const tabela = Array.isArray(f) ? f : [f];
      const bonus = tabela[j.turnosJogados] || 0;
      if (bonus) j.energia += bonus;
    }
    j.turnosJogados = (j.turnosJogados || 0) + 1;
    j.campo.forEach(function (m) { m.pronta = true; });

    if (j.baralho.length) {
      if (j.mao.length >= o_maoMax(est)) {
        // Especulacao: a carta sai da jazida e se perde, e custa escudo.
        const perdida = cartaBase(dados, j.baralho.shift());
        j.reserva -= est.cfg.custoEspeculacao;
        est.log.push('Mão cheia: ' + nomeCurto(perdida.nome) + ' se perdeu (-' +
                     est.cfg.custoEspeculacao + ' de escudo)');
        checarFim(est);
      } else {
        j.mao.push(est._instanciar(j.baralho.shift()));
      }
    } else {
      // Exaustão: sem jazida para lavrar, a reserva se esgota sozinha,
      // em ritmo crescente. É o relógio que garante fim de partida.
      j.exaustao = (j.exaustao || 0) + 1;
      j.reserva -= j.exaustao;
      est.log.push('Exaustão: -' + j.exaustao);
      checarFim(est);
    }
  }

  function o_maoMax(est) { return est.cfg.maoMax || 99; }

  function passar(est, dados) {
    est.vez = 1 - est.vez;
    iniciarTurno(est, dados);
    return ok(est);
  }

  /* ---------- degrau 2: refinar ---------- */

  // Lista o que da para refinar agora, com o custo de cada um.
  // A interface usa isto para acender o botao, do mesmo jeito que ja
  // faz com ligasDisponiveis.
  function refinaveis(est, dados) {
    const j = est.jogadores[est.vez];
    const out = [];
    
    // Refináveis do campo
    j.campo.forEach(function (c) {
      if (c.nivel !== NIVEL.CONCENTRADO) return;
      if (c.estreouNoTurno === est.turno) return;         // entrou agora
      if (est.cfg.refinoGastaAcao && !c.pronta) return;   // ja agiu neste turno
      const custo = custoRefino(est, dados, c);
      if (custo <= j.energia) {
        out.push({ uid: c.uid, nome: c.nome, custo: custo, local: 'campo' });
      }
    });

    // Refináveis da mão (P&D)
    j.mao.forEach(function (c) {
      if (c.nivel !== NIVEL.CONCENTRADO) return;
      const custo = custoRefino(est, dados, c);
      if (custo <= j.energia) {
        out.push({ uid: c.uid, nome: c.nome, custo: custo, local: 'mao' });
      }
    });

    return out;
  }

  function refinar(est, dados, uid) {
    const j = est.jogadores[est.vez];
    
    let noCampo = true;
    let c = j.campo.find(function (m) { return m.uid === uid; });
    if (!c) {
      c = j.mao.find(function (m) { return m.uid === uid; });
      noCampo = false;
    }

    if (!c) return erro('Mineral não encontrado no campo nem na mão.');
    if (c.nivel === NIVEL.LIGA) return erro('Liga não se refina.');
    if (c.nivel !== NIVEL.CONCENTRADO) return erro(nomeCurto(c.nome) + ' já está refinado.');
    
    if (noCampo) {
      if (c.estreouNoTurno === est.turno) {
        return erro(nomeCurto(c.nome) + ' entrou agora: refina no próximo turno.');
      }
      if (est.cfg.refinoGastaAcao && !c.pronta) {
        return erro(nomeCurto(c.nome) + ' já agiu neste turno.');
      }
    }

    const custo = custoRefino(est, dados, c);
    if (custo > j.energia) return erro('Faltam ' + (custo - j.energia) + ' de energia para refinar.');

    j.energia -= custo;
    c.nivel = NIVEL.REFINADO;
    c.ataque += est.cfg.refinoValor;
    c.defesa += est.cfg.refinoDureza;
    c.defesaMax += est.cfg.refinoDureza;
    
    if (noCampo && est.cfg.refinoGastaAcao) c.pronta = false;

    const eraMuro = c.barreira;
    c.barreira = calcularBarreira(est.cfg, c.nivel, c.defesaMax);
    
    const localStr = noCampo ? 'no campo' : 'na mão (P&D)';
    est.log.push('Refinou ' + nomeCurto(c.nome) + ' ' + localStr + ' (' + custo + ' energia) → ' +
                 c.ataque + '/' + c.defesa + (noCampo && !eraMuro && c.barreira ? ' — faz barreira' : ''));
    return ok(est);
  }

  function nomeCurto(nome) {
    return nome.replace(/^Min[ée]rios? do grupo da /i, '')
               .replace(/^Min[ée]rios? de /i, '');
  }

  /* ---------- degrau 3: ligas ---------- */

  /* Uma peca pode vir de dois lugares:
     - do CAMPO, e ai precisa ja estar refinada (custo zero, o investimento
       ja foi feito antes);
     - da MAO, e ai voce paga extracao + refino de uma vez. Foi este caminho
       que corrigiu o bug 4 (liga quase nunca acontecia); ele continua, so
       que agora com o pedagio do refino embutido. */
  function planejarLiga(est, dados, lg) {
    const j = est.jogadores[est.vez];
    const doCampo = [], daMao = [], faltando = [], naoRefinadas = [];
    let custo = 0;

    for (const nome of lg.cartas) {
      const c = j.campo.find(function (x) {
        return x.nivel !== NIVEL.LIGA &&
               chave(x.nome) === chave(nome) &&
               doCampo.indexOf(x) < 0;
      });
      if (c) {
        if (est.cfg.exigirRefinoParaLiga && c.nivel !== NIVEL.REFINADO) {
          naoRefinadas.push(nome);      // esta la, mas ainda e concentrado
        } else {
          doCampo.push(c);
          continue;
        }
      }
      void 0;
      const m = j.mao.find(function (x) {
        return chave(x.nome) === chave(nome) && daMao.indexOf(x) < 0;
      });
      if (m) {
        daMao.push(m);
        // Só cobra o pedágio se a carta ainda for concentrada e o combo surpresa estiver desligado.
        let pedagio = 0;
        if (est.cfg.exigirRefinoParaLiga && !est.cfg.refinoGratisNaMao && m.nivel === NIVEL.CONCENTRADO) {
           pedagio = custoRefino(est, dados, m);
        }
        custo += m.custo + pedagio;
        continue;
      }
      if (naoRefinadas.indexOf(nome) < 0) faltando.push(nome);
    }

    /* Se a configuracao aceita liga com apenas N pecas refinadas, as que
       faltavam refinar voltam a contar como validas — desde que sobrem
       refinadas suficientes. */
    const minRef = est.cfg.ligaRefinadasMin;
    if (minRef != null && naoRefinadas.length) {
      const jaRefinadas = doCampo.filter(function (c) { return c.nivel === NIVEL.REFINADO; }).length
                        + (est.cfg.exigirRefinoParaLiga ? daMao.length : 0);
      if (jaRefinadas >= minRef) {
        for (const nome of naoRefinadas.slice()) {
          const c = j.campo.find(function (x) {
            return x.nivel !== NIVEL.LIGA && chave(x.nome) === chave(nome) && doCampo.indexOf(x) < 0;
          });
          if (c) { doCampo.push(c); naoRefinadas.splice(naoRefinadas.indexOf(nome), 1); }
        }
      }
    }

    return {
      completa: faltando.length === 0 && naoRefinadas.length === 0,
      doCampo: doCampo, daMao: daMao, custo: custo,
      faltando: faltando, naoRefinadas: naoRefinadas
    };
  }

  // Devolve as ligas forjaveis agora, com o custo em energia de cada uma.
  function ligasDisponiveis(est, dados) {
    const j = est.jogadores[est.vez];
    const out = [];
    dados.ligas.forEach(function (lg) {
      const p = planejarLiga(est, dados, lg);
      /* BUG 6 (achado na simulacao da v3, existia igual na v2):
         se todas as pecas vierem da mao, a liga ocupa uma vaga NOVA no campo.
         ligasDisponiveis nao checava isso e anunciava liga que fundir recusava
         com "Campo cheio" — botao aceso que da erro ao clicar, e partida
         travada no laco do bot. A condicao aqui tem que ser a MESMA de fundir. */
      const abririaVaga = p.doCampo.length === 0;
      if (abririaVaga && j.campo.length >= est.cfg.campoMax) return;
      if (p.completa && p.custo <= j.energia) {
        out.push({
          nome: lg.nome, cartas: lg.cartas, ensina: lg.ensina,
          custo: p.custo, doCampo: p.doCampo.length, daMao: p.daMao.length
        });
      }
    });
    return out;
  }

  /* Ligas que estao a um passo: falta so refinar peca que ja esta no campo.
     Serve para a interface dizer "refine o ferro e o aço sai", que e o
     que ensina a escada sem precisar de texto. */
  function ligasQuaseLa(est, dados) {
    const out = [];
    dados.ligas.forEach(function (lg) {
      const p = planejarLiga(est, dados, lg);
      if (!p.completa && p.faltando.length === 0 && p.naoRefinadas.length) {
        out.push({ nome: lg.nome, cartas: lg.cartas, ensina: lg.ensina,
                   naoRefinadas: p.naoRefinadas });
      }
    });
    return out;
  }

  function fundir(est, dados, nomeLiga) {
    const j = est.jogadores[est.vez];
    const lg = dados.ligas.find(function (l) { return l.nome === nomeLiga; });
    if (!lg) return erro('Liga desconhecida.');

    const p = planejarLiga(est, dados, lg);
    if (p.naoRefinadas.length) {
      return erro('Refine ' + p.naoRefinadas.map(nomeCurto).join(' e ') +
                  ' antes de forjar ' + nomeLiga + '.');
    }
    if (p.faltando.length) {
      return erro('Falta ' + p.faltando.map(nomeCurto).join(' e ') +
                  ' para forjar ' + nomeLiga + '.');
    }
    if (p.custo > j.energia) {
      return erro('Faltam ' + (p.custo - j.energia) + ' de energia.');
    }
    if (p.doCampo.length === 0 && j.campo.length >= est.cfg.campoMax) {
      return erro('Campo cheio.');
    }

    j.energia -= p.custo;
    const usadas = p.doCampo.concat(p.daMao);
    const b = est.cfg.bonusLiga;

    /* Peca vinda da mao entra na conta ja refinada: o jogador pagou por isso
       no custo acima, entao a liga nao pode sair mais fraca so porque a peca
       veio da mao em vez do campo. */
    const bonusMao = est.cfg.exigirRefinoParaLiga ? p.daMao.length : 0;

    const nova = {
      uid: ++est._contador.n, cartaId: null, nome: lg.nome,
      bloco: usadas[0].bloco, custo: 0,
      ataque: usadas.reduce(function (s, m) { return s + m.ataque; }, 0)
              + b + bonusMao * est.cfg.refinoValor,
      defesa: usadas.reduce(function (s, m) { return s + m.defesa; }, 0)
              + b + bonusMao * est.cfg.refinoDureza,
      nivel: NIVEL.LIGA,
      /* Liga e o degrau mais alto da cadeia: segura por definicao quando o
         criterio e o refino. Com o criterio antigo, herda das pecas. */
      barreira: calcularBarreira(est.cfg, NIVEL.LIGA, 0) ||
                usadas.some(function (m) { return m.barreira; }),
      estreouNoTurno: null,
      pronta: true, liga: lg.nome,
      partes: usadas.map(function (m) { return m.nome; })
    };
    nova.defesaMax = nova.defesa;

    j.campo = j.campo.filter(function (m) { return usadas.indexOf(m) < 0; });
    j.mao   = j.mao.filter(function (m) { return usadas.indexOf(m) < 0; });
    j.campo.push(nova);
    est.log.push('Forjou ' + lg.nome + ' (' + nova.ataque + '/' + nova.defesa + ')' +
      (p.custo ? ' — ' + p.custo + ' energia' : ''));
    return ok(est);
  }

  /* ---------- ações ---------- */

  // Erro NAO altera o estado. Devolve {ok:false} para o chamador decidir.
  // O servidor usa isso para rejeitar jogada invalida sem corromper a partida.
  function erro(msg) { return { ok: false, erro: msg }; }
  function ok(est)   { return { ok: true, estado: est }; }

  function jogar(est, dados, uid) {
    const j = est.jogadores[est.vez];
    const i = j.mao.findIndex(function (m) { return m.uid === uid; });
    if (i < 0) return erro('Carta não está na mão.');
    const c = j.mao[i];
    if (c.custo > j.energia) return erro('Energia insuficiente.');
    if (j.campo.length >= est.cfg.campoMax) return erro('Campo cheio.');

    j.energia -= c.custo;
    j.mao.splice(i, 1);
    c.pronta = false;
    c.estreouNoTurno = est.turno;   // nao refina no turno em que entrou
    j.campo.push(c);
    est.log.push('Extraiu ' + nomeCurto(c.nome) + ' (' + c.custo + ' energia)');
    return ok(est);
  }

  /* Fichas com barreira no campo de quem defende. Se houver alguma, ela e o
     unico alvo legal — nem outra ficha, nem o escudo. A interface usa esta
     mesma lista para apagar o que nao da para clicar, entao regra e desenho
     nunca discordam. */
  function barreirasDe(jogador) {
    return jogador.campo.filter(function (m) { return m.barreira; });
  }

  // Alvos legais para uma ficha do jogador da vez. 'reserva' = o escudo.
  function alvosValidos(est) {
    const op = est.jogadores[1 - est.vez];
    const muros = barreirasDe(op);
    if (muros.length) return muros.map(function (m) { return m.uid; });
    return op.campo.map(function (m) { return m.uid; }).concat(['reserva']);
  }

  function atacar(est, dados, uidOrigem, alvo) {
    const j = est.jogadores[est.vez];
    const op = est.jogadores[1 - est.vez];
    const a = j.campo.find(function (m) { return m.uid === uidOrigem; });
    if (!a) return erro('Mineral não está no seu campo.');
    if (!a.pronta) return erro(nomeCurto(a.nome) + ' entrou agora e não pode atacar.');

    const muros = barreirasDe(op);
    if (muros.length && alvo !== 'reserva') {
      const d0 = op.campo.find(function (m) { return m.uid === alvo; });
      if (d0 && !d0.barreira) {
        return erro(muros.map(function (m) { return nomeCurto(m.nome); }).join(' e ') +
                    ' faz barreira: precisa passar por ela primeiro.');
      }
    }

    if (alvo === 'reserva') {
      if (muros.length) {
        return erro(muros.map(function (m) { return nomeCurto(m.nome); }).join(' e ') +
                    ' faz barreira: o escudo está protegido.');
      }
      op.reserva -= a.ataque;
      a.pronta = false;
      est.log.push(nomeCurto(a.nome) + ' atinge o escudo (-' + a.ataque + ')');
    } else {
      const d = op.campo.find(function (m) { return m.uid === alvo; });
      if (!d) return erro('Alvo inexistente.');
      d.defesa -= a.ataque;
      a.defesa -= d.ataque;   // troca mútua: defender revida
      a.pronta = false;
      est.log.push(nomeCurto(a.nome) + ' x ' + nomeCurto(d.nome));
      if (d.defesa <= 0) {
        op.campo = op.campo.filter(function (m) { return m !== d; });
        est.log.push(nomeCurto(d.nome) + ' se esgotou');
      }
      if (a.defesa <= 0) {
        j.campo = j.campo.filter(function (m) { return m !== a; });
        est.log.push(nomeCurto(a.nome) + ' se esgotou');
      }
    }
    checarFim(est);
    return ok(est);
  }

  function checarFim(est) {
    const a = est.jogadores[0].reserva, b = est.jogadores[1].reserva;
    if (a <= 0 && b <= 0) est.fim = 'empate';
    else if (a <= 0) est.fim = 1;
    else if (b <= 0) est.fim = 0;
  }

  /* ---------- entrada única ---------- */

  function aplicar(est, dados, acao) {
    if (est.fim !== null) return erro('Partida encerrada.');
    const vez = est.vez, turno = est.turno;
    let r;
    switch (acao.tipo) {
      case 'jogar':   r = jogar(est, dados, acao.uid); break;
      case 'refinar': r = refinar(est, dados, acao.uid); break;
      case 'atacar':  r = atacar(est, dados, acao.uid, acao.alvo); break;
      case 'fundir':  r = fundir(est, dados, acao.liga); break;
      case 'passar':  r = passar(est, dados); break;
      default:        return erro('Ação desconhecida: ' + acao.tipo);
    }
    // So acao ACEITA entra no registro. Jogada recusada nao existiu.
    if (r.ok) est.acoes.push(Object.assign({ t: turno, j: vez }, acao));
    return r;
  }

  /* Reconstroi a partida a partir de semente + acoes. Mesmo motor, mesma
     semente, mesmas acoes = mesmo estado final. Serve para analisar
     playtest depois e para o servidor auditar partida contestada. */
  function reproduzir(dados, registro) {
    const est = novoJogo(dados, registro.semente, registro.cfg);
    for (const a of registro.acoes) {
      const r = aplicar(est, dados, a);
      if (!r.ok) return { ok: false, erro: r.erro, estado: est };
    }
    return { ok: true, estado: est };
  }

  const Motor = {
    versao: 7,
    calcularBarreira: calcularBarreira,
    reproduzir: reproduzir,
    alvosValidos: alvosValidos,
    barreirasDe: barreirasDe,
    NIVEL: NIVEL,
    PADRAO: PADRAO,
    novoJogo: novoJogo,
    aplicar: aplicar,
    ligasDisponiveis: ligasDisponiveis,
    ligasQuaseLa: ligasQuaseLa,
    refinaveis: refinaveis,
    custoRefino: custoRefino,
    chave: chave,
    montarPool: montarPool
  };

  if (typeof module === 'object' && module.exports) module.exports = Motor;
  else raiz.Motor = Motor;
})(typeof self !== 'undefined' ? self : this);
