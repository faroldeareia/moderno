    /* IABOT.JS — A IA baseada em Árvore de Busca e Heurística */
(function (raiz) {
  'use strict';
  const Motor = (typeof module === 'object' && module.exports) ? require('./engine.js') : raiz.Motor;

  // Os "Pesos" da matemática. É aqui que o perfil ganha vida.
  const PESOS = {
    //                 reserva dele  minha  mesa  barreira  energia  mao  escada  letal
    ia_aggro:   { reservaInimiga: 5.0, reservaMinha: 0.1, controleMesa: 1.0, barreira: 0.5,
                  energiaParada: 0.8, cartaNaMao: 0.1, escada: 0.5, letal: 10000 },
    ia_control: { reservaInimiga: 0.5, reservaMinha: 3.0, controleMesa: 3.0, barreira: 4.0,
                  energiaParada: 0.5, cartaNaMao: 0.6, escada: 2.0, letal: 10000 },
    ia_midrange:{ reservaInimiga: 2.0, reservaMinha: 1.5, controleMesa: 2.5, barreira: 2.0,
                  energiaParada: 0.6, cartaNaMao: 0.4, escada: 1.5, letal: 10000 }
  };

  /* ORCAMENTO DE BUSCA — o conserto do travamento.

     Antes o limite era de PROFUNDIDADE (6 acoes). O problema: o numero de
     jogadas por turno varia de 3 a 27. Com 27 jogadas possiveis, 27^6 sao
     387 milhoes de estados numa decisao so, e o simulador congelava.

     Agora o limite e de NOS VISITADOS. Turno pobre continua indo fundo;
     turno rico para quando o orcamento acaba. O custo por decisao fica
     previsivel, que e o que permite usar esta IA na bateria do maestro. */
  /* 1000 foi calibrado medindo: com 100 nos a IA perde do midrange classico
     (41,7%), com 400 empata (50,0%), com 1000 ganha (62,5%) — e com 2500
     ganha o mesmo 62,5% pagando o dobro do tempo. Satura em 1000.
     Da para mexer sem editar o arquivo:  ORCAMENTO=2000 node ... */
  const ORCAMENTO = Number(
    (typeof process === 'object' && process.env && process.env.ORCAMENTO) || 1000);
  const PROFUNDIDADE_MAX = 8;

  function listarAcoesValidas(est, dados) {
    const j = est.jogadores[est.vez];
    const op = est.jogadores[1 - est.vez];
    const acoes = [];
    
    // Jogar cartas
    j.mao.forEach(c => {
        if (c.custo <= j.energia && j.campo.length < est.cfg.campoMax) 
            acoes.push({ tipo: 'jogar', uid: c.uid });
    });
    // Refinar e Fundir (Degraus da escada)
    Motor.refinaveis(est, dados).forEach(r => acoes.push({ tipo: 'refinar', uid: r.uid }));
    Motor.ligasDisponiveis(est, dados).forEach(l => acoes.push({ tipo: 'fundir', liga: l.nome }));
    // Atacar
    const alvos = Motor.alvosValidos(est);
    j.campo.filter(c => c.pronta).forEach(c => {
        alvos.forEach(alvo => acoes.push({ tipo: 'atacar', uid: c.uid, alvo: alvo }));
    });
    return acoes;
  }

  // A função que dá a "nota" para o tabuleiro
  function avaliarEstado(est, jogadorOriginal, perfil) {
    const pesos = PESOS[perfil] || PESOS.ia_midrange;
    
    // Condições de vitória/derrota imediatas
    if (est.fim === jogadorOriginal) return pesos.letal;
    if (est.fim === (1 - jogadorOriginal)) return -pesos.letal;
    if (est.fim === 'empate') return -5000;

    const meu = est.jogadores[jogadorOriginal];
    const op = est.jogadores[1 - jogadorOriginal];
    let score = 0;

    // Diferença de Reserva (Força Geopolítica)
    score += (meu.reserva * pesos.reservaMinha);
    score -= (op.reserva * pesos.reservaInimiga);

    // Controle de Mesa (Corpos no chão)
    meu.campo.forEach(c => {
        score += (c.ataque + c.defesa) * pesos.controleMesa;
        if (c.barreira) score += c.defesa * pesos.barreira; // Barreiras valem mais
    });
    op.campo.forEach(c => {
        score -= (c.ataque + c.defesa) * pesos.controleMesa;
        if (c.barreira) score -= c.defesa * pesos.barreira;
    });

    /* ENERGIA PARADA é desperdício.
       Sem isto, torrar 9 de energia em corpo fraco pontua igual a guardar 4
       para o P&D do turno seguinte — e o bot nunca aprende a segurar. */
    score -= meu.energia * pesos.energiaParada;

    /* CARTA NA MÃO é recurso, não sobra. Peso pequeno de propósito: o
       suficiente para ele não jogar tudo à toa, não tanto que ele trave. */
    score += meu.mao.length * pesos.cartaNaMao;

    /* A ESCADA: estar perto de uma liga vale alguma coisa.
       Sem isto o control e o midrange nunca perseguem liga de propósito —
       eles só forjam quando ela cai no colo. É o peso que faz a mecânica
       central do jogo existir para a IA. */
    if (pesos.escada) {
      meu.campo.forEach(c => { if (c.nivel === 1) score += pesos.escada; });
      meu.mao.forEach(c   => { if (c.nivel === 1) score += pesos.escada * 0.5; });
    }

    return score;
  }

  // Busca em Profundidade: Tenta todas as ramificações do turno
  function buscarMelhorTurno(est, dados, jogadorOriginal, perfil, profundidade, orcamento) {
    if (est.fim !== null || profundidade >= PROFUNDIDADE_MAX || orcamento.nos <= 0) {
        return { acao: { tipo: 'passar' }, score: avaliarEstado(est, jogadorOriginal, perfil) };
    }

    const acoes = listarAcoesValidas(est, dados);
    if (acoes.length === 0) {
        return { acao: { tipo: 'passar' }, score: avaliarEstado(est, jogadorOriginal, perfil) };
    }

    let melhorAcao = { tipo: 'passar' };
    // Se passar agora, qual é a nota da mesa?
    let melhorScore = avaliarEstado(est, jogadorOriginal, perfil);

    for (let acao of acoes) {
        if (orcamento.nos <= 0) break;   // acabou o orcamento, para por aqui
        orcamento.nos--;
        let clone = Motor.clonarEstado(est);
        let resultado = Motor.aplicar(clone, dados, acao);

        if (resultado.ok) {
            // Se a ação foi válida, mergulha no futuro para ver as próximas jogadas
            let futuro = buscarMelhorTurno(resultado.estado, dados, jogadorOriginal, perfil, profundidade + 1, orcamento);
            if (futuro.score > melhorScore) {
                melhorScore = futuro.score;
                melhorAcao = acao; // Guardamos a PRIMEIRA ação dessa linha do tempo vitoriosa
            }
        }
    }
    return { acao: melhorAcao, score: melhorScore };
  }

  function obterAcao(est, dados, perfil) {
    // Retorna a melhor primeira ação encontrada na simulação do turno
    let resultado = buscarMelhorTurno(est, dados, est.vez, perfil, 0, { nos: ORCAMENTO });
    return resultado.acao;
  }

  var IABot = { obterAcao: obterAcao, PERFIS: Object.keys(PESOS) };
  if (typeof module === 'object' && module.exports) module.exports = IABot;
  else raiz.IABot = IABot;
})(typeof self !== 'undefined' ? self : this);
