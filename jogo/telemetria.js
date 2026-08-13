/* TELEMETRIA.JS : a partida vai para o servidor sozinha.

   O que ele baixa: semente, cfg,  lista de ações e o bloco `partida` (modo, nomes, contra qual bot, vencedor). 
   Como o motor é determinístico, então semente + ações  RECONSTROEM a partida inteira, jogada por jogada. Guardando os arquivos, podemos auditar o jogo depois.
   Há um serviço separado (script) que faz a análise, quando necessária, juntando as várias partidas. Conseguimos responder: qual estilo de jogar vence mais, se começar como jogador 1 ou 2 é balançeado. No xadrez, por exemplo, as brancas tem um pouco mais de 50% de chance de vencer (52 a 56%).
   A telemetria também mede a taxa de abandono da partida e em que ponto se desistiu do jogo (para inferirmos se foi uma desistência por tédio ou pois o jogo já estava perdido mesmo). 
   Nada que possa indetificar ou afetar a privacidade do usuário é guardado, como nome, endereço IP, etc. Ver função `limpar()`.
*/ 
(function (raiz) {
  'use strict';

  /* O endereço do endpoint que recebe. 
       · `localStorage` fica no navegador DO JOGADOR. É só uma sala de
         espera para quando o servidor está fora ou não há internet.
       · `registropartidas/AAAA-MM/` fica NO SERVIDOR. É o acervo de
         verdade, e é de lá que as estatísticas saem.
     Uma não substitui a outra: sem a fila, uma partida jogada offline se perderia; sem a pasta, não haveria acervo. */
   
  var DESTINO = 'api/partida';

  var CHAVE_FILA = 'minerais.fila';
  var MAX_FILA   = 40;     /* ~350 KB. Acima disso o navegador reclama, e
                              uma fila que nunca esvazia é sinal de que o
                              servidor está fora — não adianta acumular. */

  function lerFila() {
    try { return JSON.parse(localStorage.getItem(CHAVE_FILA) || '[]'); }
    catch (e) { return []; }
  }
  function gravarFila(f) {
    try { localStorage.setItem(CHAVE_FILA, JSON.stringify(f.slice(-MAX_FILA))); }
    catch (e) { /* cota cheia ou modo privado: perde-se a fila, e tudo bem */ }
  }

/* Tira o que é volumoso e redundante. (Privacidade desativada para análise) */
  function limpar(reg) {
    var r = JSON.parse(JSON.stringify(reg));
    delete r.log; // Apagamos só o log para economizar espaço
    
    // Os nomes dos jogadores e do vencedor serão mantidos intactos!
    
    return r;
  }

  /* `sendBeacon` é o único envio que o navegador garante durante o
     fechamento da aba. `fetch` normal é cancelado no meio. */
  function enviar(reg) {
    if (!DESTINO) return false;
    var corpo = new Blob([JSON.stringify(reg)], { type: 'application/json' });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(DESTINO, corpo)) return true;
    } catch (e) {}
    try {
      fetch(DESTINO, { method: 'POST', body: corpo, keepalive: true,
                       headers: { 'Content-Type': 'application/json' } });
      return true;
    } catch (e) { return false; }
  }

  /* Ao abrir a página, tenta despachar o que ficou para trás, de quando
     o servidor estava fora, ou de quando não havia internet para o jogador. */
  function despacharFila() {
    if (!DESTINO) return;
    var f = lerFila();
    if (!f.length) return;
    var sobrou = [];
    for (var i = 0; i < f.length; i++) if (!enviar(f[i])) sobrou.push(f[i]);
    gravarFila(sobrou);
  }

  var jaRegistrou = {};   /* semente+motivo já enviados nesta sessão */

  var Telemetria = {
    ativo: true,

    /* Chamado pelo mesa.js. `montar` é o `montarRegistro` de lá (essa telemetria não sabe montar registro, de propósito, para não existir sobreposição). */
    registrar: function (montar, motivo) {
      if (!this.ativo || typeof montar !== 'function') return;
      var reg;
      try { reg = montar(motivo); } catch (e) { return; }
      if (!reg || !reg.acoes || reg.acoes.length < 4) return;   // nem começou

      /* Uma partida por motivo. Sem isto, sair pelo botão dispararia 'abandono' e o `pagehide` dispararia de novo logo depois. */
      var id = reg.semente + ':' + motivo;
      if (jaRegistrou[id]) return;
      jaRegistrou[id] = 1;

      var enxuto = limpar(reg);
      if (!enviar(enxuto)) {
        var f = lerFila();
        f.push(enxuto);
        gravarFila(f);
      }
    },

    /* Liga os três gatilhos. O mesa.js chama isto uma vez. */
    ligar: function (montar, temPartida) {
      var eu = this;
      despacharFila();

      /* `pagehide` em vez de `beforeunload`: é o único que dispara no
         Safari do iPhone quando a pessoa troca de app ou bloqueia a tela,
         que é como a maioria das partidas de celular termina. */
      addEventListener('pagehide', function () {
        if (temPartida && temPartida()) eu.registrar(montar, 'abandono');
      });
      /* rede de segurança para navegadores que não disparam pagehide */
      addEventListener('beforeunload', function () {
        if (temPartida && temPartida()) eu.registrar(montar, 'abandono');
      });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden' && temPartida && temPartida())
          eu.registrar(montar, 'abandono');
      });
    },

    /* Para ver o que está na fila, do console do navegador. */
    fila: lerFila,
    destino: function (url) { DESTINO = url || ''; despacharFila(); }
  };

  raiz.Telemetria = Telemetria;
})(typeof self !== 'undefined' ? self : this);
