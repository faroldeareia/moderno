/* BOTS.JS — o cérebro dos adversários. FONTE ÚNICA.

   =========================================================================
   ESTE ARQUIVO É A ÚNICA CÓPIA DA LÓGICA DOS BOTS.
   O simuladorcompleto.js faz require dele. O jogo.html carrega por <script>.
   Não copie este código para lugar nenhum: se existirem duas cópias, daqui
   a um mês ninguém lembra qual é a que vale — foi exatamente por isso que o
   montar-minerais.js foi aposentado.
   =========================================================================

   ATENÇÃO, ANTES DE MEXER: estes bots NÃO são só adversários. Eles são o
   INSTRUMENTO DE MEDIDA com que o balanceamento inteiro do jogo foi
   calibrado. Mudar uma linha aqui muda todos os números do
   LOG-MUDANCAS.md e do historiadojogo.md.

   O projeto já pagou caro por isso uma vez: o bot aggro jogava mal, foram
   dias ajustando REGRAS DO JOGO para compensar, e consertar o bot mudou o
   resultado de 27,6% para 61,8% no mesmo jogo. A lição está no capítulo 5
   do historiadojogo.md: antes de mudar o jogo, verifique quem está medindo.

   Se for mexer: rode a bateria antes e depois, e registre os dois números.

   OS SEIS PERFIS
     aleatorio   sorteia qualquer jogada válida. É a criança apertando tudo.
     iniciante   joga a carta mais cara que couber e bate na cara.
     aggro       zerar a reserva do outro o mais rápido possível.
     midrange    valor e controle de mesa, ataca quando é seguro.
     control     segurar o jogo, limpar a mesa, vencer no fim.
     combo       perseguir a liga, custe o que custar.

   Os dois primeiros são régua de sanidade: se o jogo não premia jogar bem,
   o aleatório ganharia demais e saberíamos que tem coisa errada.

   Extraído do simuladorcompleto.js em 10/08/2026, SEM ALTERAÇÃO NENHUMA —
   conferido jogada a jogada contra a versão anterior (ver LOG-MUDANCAS.md).
*/
(function (raiz) {
  'use strict';

  /* No node vem do require; no navegador é o global que o engine.js criou. */
  var Motor = (typeof module === 'object' && module.exports)
    ? require('./engine.js')
    : raiz.Motor;

/* ------------------------------------------------------------------
   OS PERFIS `ia_*` MORAM NO bot2.js.

   Este arquivo continua sendo a porta unica: quem quiser um bot pede aqui,
   e aqui se decide de onde ele vem. Assim o simuladorcompleto.js, o
   maestro e o jogo nao precisam saber que existem dois cerebros.

   Consequencia pratica: como o simuladorcompleto varre Bots.PERFIS, os
   perfis de IA entram na matriz do dossie SOZINHOS — velhos contra velhos,
   IA contra velhos, e IA contra ela mesma. O duelo sai da mesma esteira de
   sempre, sem script novo.

   Lembre que a IA e ~35x mais lenta. Baixe PARTIDAS_POR_CONFRONTO na linha
   7 do simuladorcompleto.js antes de rodar com ela.
   ------------------------------------------------------------------ */
  var IA = null;
  try {
    IA = (typeof module === 'object' && module.exports)
       ? require('./bot2.js')
       : raiz.IABot;
  } catch (e) { IA = null; }

function obterAcao(est, dados, perfil) {
    if (perfil && perfil.indexOf('ia_') === 0) {
      if (!IA) return { tipo: 'passar' };   // bot2.js ausente: nao quebra
      return IA.obterAcao(est, dados, perfil);
    }

    const j = est.jogadores[est.vez];
    const op = est.jogadores[1 - est.vez];
    const acoes = [];
    
    const cartasJogaveis = j.mao.filter(c => c.custo <= j.energia && j.campo.length < est.cfg.campoMax);
    cartasJogaveis.forEach(c => acoes.push({ tipo: 'jogar', uid: c.uid }));
    Motor.refinaveis(est, dados).forEach(r => acoes.push({ tipo: 'refinar', uid: r.uid }));
    Motor.ligasDisponiveis(est, dados).forEach(l => acoes.push({ tipo: 'fundir', liga: l.nome }));
    
    const alvosValidos = Motor.alvosValidos(est);
    j.campo.filter(c => c.pronta).forEach(c => {
        alvosValidos.forEach(alvo => {
            let alvoAtaque = 0, alvoDefesa = 0;
            if (alvo !== 'reserva') {
                const lacaio = op.campo.find(x => x.uid === alvo);
                alvoAtaque = lacaio?.ataque || 0;
                alvoDefesa = lacaio?.defesa || 0;
            }
            acoes.push({ tipo: 'atacar', uid: c.uid, alvo: alvo, alvoAtaque: alvoAtaque, alvoDefesa: alvoDefesa, meuAtaque: c.ataque });
        });
    });
    
    acoes.push({ tipo: 'passar' });

    if (perfil === 'aleatorio') return acoes[Math.floor(Math.random() * acoes.length)];

    const fundicoes = acoes.filter(a => a.tipo === 'fundir');
    const ataquesFace = acoes.filter(a => a.tipo === 'atacar' && a.alvo === 'reserva');
    const ataquesLacaio = acoes.filter(a => a.tipo === 'atacar' && a.alvo !== 'reserva');
    const jogadas = acoes.filter(a => a.tipo === 'jogar');
    const refinos = acoes.filter(a => a.tipo === 'refinar');

    if (perfil === 'iniciante') {
        if (jogadas.length) return jogadas.sort((a, b) => { let cA = j.mao.find(x => x.uid === a.uid); let cB = j.mao.find(x => x.uid === b.uid); return (cB?.custo || 0) - (cA?.custo || 0); })[0];
        if (ataquesFace.length) return ataquesFace[0];
        if (ataquesLacaio.length) return ataquesLacaio[0];
        if (refinos.length) return refinos[0];
        return { tipo: 'passar' };
    }

    /* ================================================================
       AGGRO — trocado em 09/08/2026. A versão anterior está em
       backups/20260809-2130/simuladorcompleto.js e era esta:

           if (jogadas.length) return jogadas.sort(MAIS BARATA PRIMEIRO)[0];
           if (ataquesFace.length) return ataquesFace[0];
           if (ataquesLacaio.length) return ataquesLacaio[0];
           if (refinos.length) return refinos[0];

       Por que mudou (medido, 500 partidas por confronto):

         · Descia a carta MAIS BARATA primeiro. Com 4 de energia, jogava um
           custo 1 antes de olhar para o custo 4 — e como o campo só tem 5
           vagas, entupia a mesa com corpo fraco. Corrigir isso sozinho:
           27,6% -> 45,0% contra o midrange.

         · Pegava `ataquesFace[0]`, o primeiro item da lista, sem ordenar e
           sem somar o dano disponível. Perdia partidas ganhas por gastar o
           turno descendo lacaio com a vitória na mesa.

         · Refinava só em ÚLTIMO CASO. Não era proibição: ele já refinava 2,6
           vezes por partida — mas justamente nos turnos em que a jogada não
           valia nada. Mesmo orçamento de ação, resultado oposto.

       O muro barato NÃO descaracteriza o arquétipo. Refinar um custo 1 sai
       por 2 de energia, dá +2/+2 e vira barreira: a Faca 2/1 vira 4/3 muro
       por 3 de energia. É proteger a vantagem de tempo que a corrida já
       construiu, do mesmo jeito que face hunter joga lacaio com Provocar.
       A prova de que continua sendo aggro: refina o mesmo tanto que antes
       (2,77 contra 2,60) e fecha a partida MAIS RÁPIDO (15,1 turnos contra
       16,6). Control refina parecido e alonga.

       Resultado contra o midrange: 27,6% -> 61,8%. O alvo é 47%, ou seja,
       agora sobra — o que é problema bem melhor de ter.
       ================================================================ */
    if (perfil === 'aggro') {
        /* 1. LETAL: se o dano na mesa já fecha, não faz mais nada. */
        if (ataquesFace.length) {
            const danoNaMesa = j.campo.filter(c => c.pronta).reduce((s, c) => s + c.ataque, 0);
            if (danoNaMesa >= op.reserva) return ataquesFace.sort((a, b) => b.meuAtaque - a.meuAtaque)[0];
        }

        /* 2. MURO BARATO: só quando as três valem juntas — estou na frente,
              ele tem ficha na mesa, e eu ainda não tenho barreira. Refina a
              carta de MENOR custo do campo, onde o +2/+2 pesa mais. */
        const temBarreiraAgr = j.campo.some(c => c.barreira);
        const refinosCampoAgr = refinos.filter(r => j.campo.some(c => c.uid === r.uid));
        if (j.reserva >= op.reserva && !temBarreiraAgr && op.campo.length > 0 && refinosCampoAgr.length) {
            return refinosCampoAgr.sort((a, b) => {
                const cA = j.campo.find(x => x.uid === a.uid), cB = j.campo.find(x => x.uid === b.uid);
                return (cA?.custo || 99) - (cB?.custo || 99);
            })[0];
        }

        /* 3. DESCER CARTA: a de MAIOR ataque que couber. Empate pelo maior
              custo, porque vaga de campo é o recurso escasso. */
        if (jogadas.length) return jogadas.sort((a, b) => {
            const cA = j.mao.find(x => x.uid === a.uid), cB = j.mao.find(x => x.uid === b.uid);
            if ((cB?.ataque || 0) !== (cA?.ataque || 0)) return (cB?.ataque || 0) - (cA?.ataque || 0);
            return (cB?.custo || 0) - (cA?.custo || 0);
        })[0];

        /* 4. ATACAR: face sempre que a face estiver aberta. Se estiver
              trancada por barreira, derruba a que morre com menos
              desperdício; se nenhuma morre, ataca com quem sobrevive. */
        if (ataquesFace.length) return ataquesFace.sort((a, b) => b.meuAtaque - a.meuAtaque)[0];
        const mataAgr = ataquesLacaio.filter(a => a.meuAtaque >= a.alvoDefesa);
        if (mataAgr.length) {
            return mataAgr.sort((a, b) =>
                (a.meuAtaque - a.alvoDefesa) - (b.meuAtaque - b.alvoDefesa) ||
                b.alvoAtaque - a.alvoAtaque)[0];
        }
        const sobreviveAgr = ataquesLacaio.filter(a => {
            const meu = j.campo.find(x => x.uid === a.uid);
            return meu && meu.defesa > a.alvoAtaque;
        });
        if (sobreviveAgr.length) return sobreviveAgr.sort((a, b) => b.meuAtaque - a.meuAtaque)[0];
        if (ataquesLacaio.length) return ataquesLacaio[0];

        if (refinos.length) return refinos[0];
        return { tipo: 'passar' };
    }

    if (perfil === 'control') {
        if (fundicoes.length) return fundicoes[0];
        const trocasLetais = ataquesLacaio.filter(a => a.meuAtaque >= a.alvoDefesa);
        if (trocasLetais.length) return trocasLetais.sort((a, b) => b.alvoAtaque - a.alvoAtaque)[0];
        const temBarreira = j.campo.some(c => c.barreira);
        const refinosCampo = refinos.filter(r => j.campo.some(c => c.uid === r.uid));
        if (!temBarreira && refinosCampo.length) return refinosCampo[0];
        if (jogadas.length) return jogadas.sort((a, b) => { let cA = j.mao.find(x => x.uid === a.uid); let cB = j.mao.find(x => x.uid === b.uid); let refA = cA.nivel > 0 ? 1 : 0; let refB = cB.nivel > 0 ? 1 : 0; if (refA !== refB) return refB - refA; return (cB?.defesa || 0) - (cA?.defesa || 0); })[0];
        if (refinos.length) return refinos[0];
        if (ataquesFace.length) return ataquesFace[0];
        if (ataquesLacaio.length) return ataquesLacaio[0];
        return { tipo: 'passar' };
    }

    if (perfil === 'midrange') {
        if (fundicoes.length) return fundicoes[0];
        let maxAtkInimigo = 0, maxDefInimigo = 0;
        op.campo.forEach(c => { if (c.ataque > maxAtkInimigo) maxAtkInimigo = c.ataque; if (c.defesa > maxDefInimigo) maxDefInimigo = c.defesa; });
        const inimigoAgressivo = maxAtkInimigo > maxDefInimigo;
        const favoraveis = ataquesLacaio.filter(a => a.meuAtaque >= a.alvoDefesa || a.alvoAtaque < a.meuAtaque);
        if (favoraveis.length) return favoraveis[0];
        if (jogadas.length) return jogadas.sort((a, b) => { let cA = j.mao.find(x => x.uid === a.uid); let cB = j.mao.find(x => x.uid === b.uid); if (inimigoAgressivo) return (cB?.defesa || 0) - (cA?.defesa || 0); return (cB?.ataque || 0) - (cA?.ataque || 0); })[0];
        if (refinos.length) return refinos.sort((a, b) => { let aNoCampo = j.campo.some(c => c.uid === a.uid) ? 1 : 0; let bNoCampo = j.campo.some(c => c.uid === b.uid) ? 1 : 0; return bNoCampo - aNoCampo; })[0];
        if (ataquesFace.length) return ataquesFace[0];
        if (ataquesLacaio.length) return ataquesLacaio[0];
        return { tipo: 'passar' };
    }
    
    if (perfil === 'combo') {
        if (fundicoes.length) return fundicoes[0];
        let maxReqsAtendidos = 0; let pecasNaMao = [], pecasNoCampo = [];
        dados.ligas.forEach(l => {
            let reqsAtendidos = 0; let tMao = [], tCampo = [];
            l.cartas.forEach(req => {
                let noCampo = j.campo.find(c => Motor.chave(c.nome) === Motor.chave(req));
                let naMao = j.mao.find(c => Motor.chave(c.nome) === Motor.chave(req));
                if (noCampo) { reqsAtendidos++; tCampo.push(noCampo); } else if (naMao) { reqsAtendidos++; tMao.push(naMao); }
            });
            if (reqsAtendidos > maxReqsAtendidos) { maxReqsAtendidos = reqsAtendidos; pecasNaMao = tMao; pecasNoCampo = tCampo; }
        });
        const refinosMao = refinos.filter(r => pecasNaMao.some(p => p.uid === r.uid));
        if (refinosMao.length) return refinosMao[0];
        const temBarreira = j.campo.some(c => c.barreira);
        if (!temBarreira) {
            const refinosBloqueadores = refinos.filter(r => j.campo.some(c => c.uid === r.uid) && !pecasNoCampo.some(p => p.uid === r.uid));
            if (refinosBloqueadores.length) return refinosBloqueadores[0]; 
        }
        const jogadasBloqueadores = jogadas.filter(a => !pecasNaMao.some(p => p.uid === a.uid)).sort((a, b) => { let cA = j.mao.find(x => x.uid === a.uid); let cB = j.mao.find(x => x.uid === b.uid); return (cB?.defesa || 0) - (cA?.defesa || 0); });
        if (jogadasBloqueadores.length && j.campo.length < est.cfg.campoMax) return jogadasBloqueadores[0];
        const jogadasIngredientes = jogadas.filter(a => pecasNaMao.some(p => p.uid === a.uid));
        if (jogadasIngredientes.length && (temBarreira || j.mao.length >= 7)) return jogadasIngredientes[0];
        const ataquesFaceSeguros = ataquesFace.filter(a => !pecasNoCampo.some(p => p.uid === a.uid));
        const ataquesLacaioSeguros = ataquesLacaio.filter(a => !pecasNoCampo.some(p => p.uid === a.uid));
        if (ataquesLacaioSeguros.length) return ataquesLacaioSeguros[0];
        if (ataquesFaceSeguros.length) return ataquesFaceSeguros[0];
        return { tipo: 'passar' };
    }
    return { tipo: 'passar' };
}

  var Bots = {
    /* Os seis classicos. Os `ia_*` NAO entram aqui de proposito: acrescente
       com Bots.PERFIS.concat(Bots.PERFIS_IA) quando quiser o duelo, senao
       toda bateria de regra passaria a arrastar a IA lenta junto. */
    PERFIS: ['aleatorio', 'iniciante', 'aggro', 'midrange', 'control', 'combo'],
    PERFIS_IA: (IA && IA.PERFIS) ? IA.PERFIS : [],
    obterAcao: obterAcao
  };

  if (typeof module === 'object' && module.exports) module.exports = Bots;
  else raiz.Bots = Bots;
})(typeof self !== 'undefined' ? self : this);
