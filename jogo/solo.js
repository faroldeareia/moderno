/* SOLO.JS — a partida contra o computador.

   Este arquivo NÃO tem regra de jogo e NÃO tem cérebro de bot. Ele só faz
   três coisas:

     1. lê da URL contra quem a pessoa escolheu jogar (inicio.html);
     2. sorteia quem começa;
     3. pilota o bot: pergunta a jogada ao bots.js e a entrega ao mesa.js,
        com pausa entre uma e outra.

   A regra mora no engine.js, o cérebro no bots.js e a tela no mesa.js.
   Se um dia isto aqui crescer e virar "quase um bot", é sinal de que
   alguma coisa foi parar no lugar errado.

   Carregado DEPOIS do bots.js e ANTES do mesa.js (ver jogo.html). Quando a
   URL não diz nada, `Solo.ativo` fica falso e o jogo se comporta
   exatamente como antes.
*/
(function (raiz) {
  'use strict';

  var p = new URLSearchParams(location.search);

  /* Os cinco adversários. Os nomes de exibição e os perfis internos são os
     mesmos do inicio.html — se mudar lá, mude aqui. */
  /* Tem que bater com o ADVERSARIOS do inicio.html. O porquê de cada
     perfil está lá, com os números da medição. */
  var ADVERSARIOS = {
    prospeccao:     { nome: 'Prospecção',     perfil: 'aleatorio' },
    lavra:          { nome: 'Lavra',          perfil: 'aggro' },
    fundicao:       { nome: 'Fundição',       perfil: 'midrange' },
    refinaria:      { nome: 'Refinaria',      perfil: 'control' },
    /* o bot de árvore de busca do bot2.js: ganha de todos os outros */
    verticalizacao: { nome: 'Verticalização', perfil: 'ia_midrange' }
  };


  var idBot = p.get('bot') || null;
  var escolhido = ADVERSARIOS[idBot] || null;
  var nomeHumano = (p.get('nome') || '').slice(0, 18).trim() || 'Você';

  /* ------------------------------------------------------------------
     O RITMO DO BOT.

     Ele NÃO pode jogar instantâneo. Se as seis jogadas dele saem no mesmo
     quadro, a pessoa vê o tabuleiro mudar de uma vez e não faz ideia do
     que aconteceu — e o objetivo do jogo é justamente ela entender a
     escada olhando alguém subir.

     Cada tipo de jogada tem seu tempo, proporcional ao quanto ela muda o
     tabuleiro. Forjar liga é o clímax da partida e ganha a pausa maior.

     DOBRADO em 10/08 depois do primeiro playtest. O Thomas: "fica tudo
     MUITO RÁPIDO, eu que sou experiente em Hearthstone fiquei confuso".
     Se um jogador de TCG se perde, quem nunca viu um não tem chance.

     Cada jogada agora dura o tempo de LER a faixa que a anuncia (a
     `falaDoBot` do mesa.js fica 1,5 s na tela). Uma partida do bot ficou
     mais lenta, e é o preço certo: o jogo existe para ensinar a cadeia
     produtiva, e ninguém aprende olhando um tabuleiro que muda sozinho. */
  var RITMO = {
    jogar:   1500,
    refinar: 1700,
    fundir:  2600,   // o clímax da partida: dá tempo de ler a liga forjada
    atacar:  1400,
    passar:  1100
  };
  var PAUSA_INICIAL = 1200;  // antes da primeira jogada do turno dele

  var Solo = {
    ativo: !!escolhido,
    humano: 0,
    id: idBot,
    perfil: escolhido ? escolhido.perfil : null,
    nomeBot: escolhido ? escolhido.nome : null,
    nomes: [nomeHumano, escolhido ? escolhido.nome : 'Jogador 2'],
    pensando: false,
    _timer: null,

    /* QUEM COMEÇA É SORTEADO, e isso não é detalhe.

       O motor compensa quem joga em segundo: mão de 5 em vez de 4, uma
       carta a mais na jazida e energia extra nos dois primeiros turnos
       (`maoSegundo`, `baralhoSegundoExtra`, `fichaSegundo` no dados.js).
       A medição de espelho de 09/08 mostrou o jogador 2 vencendo 60% no
       espelho do aggro — ou seja, o lado importa.

       Se o humano fosse sempre o mesmo lado, a dificuldade real do jogo
       seria outra e ninguém perceberia. */
    sortearLados: function () {
      if (!this.ativo) return;
      this.humano = Math.random() < 0.5 ? 0 : 1;
      this.nomes = [];
      this.nomes[this.humano] = nomeHumano;
      this.nomes[1 - this.humano] = this.nomeBot;
      this.pensando = false;
      clearTimeout(this._timer);
    },

    /* Chamado pelo mesa.js depois de cada jogada aceita e ao começar a
       partida. Se for a vez do bot, agenda a próxima jogada dele. */
    talvezJogar: function () {
      if (!this.ativo) return;
      clearTimeout(this._timer);
      var est = raiz.estadoAtual && raiz.estadoAtual();
      if (!est || est.fim !== null) { this.pensando = false; return; }
      if (est.vez === this.humano) { this.pensando = false; return; }

      var eu = this;
      var primeira = !this.pensando;
      this.pensando = true;
      this._timer = setTimeout(function () { eu._umLance(); },
                               primeira ? PAUSA_INICIAL : 420);
    },

    _umLance: function () {
      var est = raiz.estadoAtual && raiz.estadoAtual();
      if (!this.ativo || !est || est.fim !== null) { this.pensando = false; return; }
      if (est.vez === this.humano) { this.pensando = false; return; }

      var acao;
      try {
        acao = raiz.Bots.obterAcao(est, raiz.DADOS, this.perfil);
      } catch (e) {
        console.error('bot falhou, passando o turno:', e);
        acao = { tipo: 'passar' };
      }
      if (!acao) acao = { tipo: 'passar' };

      var eu = this;
      var espera = RITMO[acao.tipo] || 700;

      /* O `agir` do mesa.js chama `talvezJogar` de novo no fim, então o
         encadeamento acontece sozinho. O `pensando` continua ligado até a
         vez voltar para a pessoa — é ele que autoriza a jogada a passar
         pela trava do agir. */
      setTimeout(function () {
        var agora = raiz.estadoAtual && raiz.estadoAtual();
        if (!eu.ativo || !agora || agora.fim !== null) { eu.pensando = false; return; }
        var ok = raiz.agir(acao);
        /* Jogada recusada seria laço infinito: o bot insistiria no mesmo
           lance para sempre. Se acontecer, ele passa o turno e a partida
           continua — e o console registra, porque isso é bug do bots.js e
           não pode passar despercebido. */
        if (!ok) {
          console.warn('jogada do bot recusada:', acao, '- passando o turno');
          raiz.agir({ tipo: 'passar' });
        }
      }, espera);
    }
  };

  raiz.Solo = Solo;
})(typeof self !== 'undefined' ? self : this);
