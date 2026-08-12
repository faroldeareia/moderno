/* DADOS.JS — regras, cartas e ligas do jogo.

   EDITE AQUI MESMO. Depois de mexer, rode  node conferir.js

   CADA CARTA TEM TRÊS NOMES, um por degrau da escada:

     nome      o nome de jogo, o que aparece grande na carta
     minerio   a substância no degrau 0, como sai do chão
     refinado  a substância no degrau 1, depois do refino

   O terceiro degrau é a liga, e o nome dela está lá embaixo, em "ligas".
   Calcopirita vira cobre catódico vira bronze: a escada do jogo contada
   no nome da carta, sem precisar de texto explicativo nenhum.

   A FRASE ensina por que o mineral importa. Até 17 palavras — acima
   disso não cabe na carta pequena da mão sem encolher a fonte.

   ELEMENTO é o selo do canto da carta. Só aparência, não entra em conta
   nenhuma. Regra: símbolo químico do elemento de que a carta trata; e
   quando a carta não é um elemento só (as de base), a fórmula do mineral
   de referência. Faltando, a carta mostra um traço e nada quebra.

   BLOCO é a família, e é ela que dá a COR da carta. Os cinco valores
   abaixo têm que bater LETRA POR LETRA com as chaves do objeto COR no
   mesa.js — acento e barra inclusive. Se não baterem, a carta cai na cor
   padrão e o console avisa.

   Régua: soma dos atributos = custo x 2 + 1. Exceções: Urânio +1,
   Molibdênio e Tungstênio -1 (subprodutos).
   Força = produção e raridade.  Dureza = importância geopolítica.
*/
(function(r){var D={

  "regras": {
    // --- STATUS GERAIS ---
    "reserva": 25,          // 20 no baralho teorico. As cartas de minerais sao
                            // um ponto mais fortes (soma = custo x 2 + 1), entao
                            // a partida encurtava 2 turnos e isso sozinho
                            // entregava o jogo ao aggro. Mais vida devolve o
                            // folego. Medido 23 contra 25: tudo dentro da margem
                            // de erro, com uma troca minuscula — aggro -2,
                            // control e combo +1 cada. Fica 25 por ser numero
                            // redondo, que numa feira se explica melhor.
    "energiaInicial": 1,
    "energiaMax": 9,
    "baralho": 16,          // era 25. Com 25 a jazida so esgotava no turno 42 e a
                            // exaustao decidia 0,4% das partidas — era decoracao.
                            // Com 16 ela decide 13%, uma em cada oito. Entre 15 e
                            // 18 o equilibrio e plano: nao custa nada.
    "maoInicial": 4,
    "campoMax": 5,
    "exaustaoComeBarreira": 1,   // a exaustao come as barreiras antes da reserva,
                                 // da menor dureza para a maior. Progressiva:
                                 // 1, 2, 3... Precisa do engine.js versao 10+.

    // --- BALANCEAMENTO JOGADOR 2 ---
    "maoSegundo": 5,
    "fichaSegundo": [1, 1],
    "baralhoSegundoExtra": 1,

    // --- GARANTIA E ESPECULACAO ---
    "garantiaCusto": 2,
    "garantiaMin": 1,
    "maoMax": 8,
    "custoEspeculacao": 1,

    // --- REFINO E LIGAS ---
    "refinoDivisor": 2,
    "refinoMin": 3,         // era 2. O custo e max(piso, teto(custo/2)), entao
                            // custo 1 e custo 4 pagavam os mesmos 2 de energia.
                            // Era o que fazia a carta mais barata do jogo ser
                            // tambem o melhor muro do jogo.
    "refinoValor": 1,       // era 2. Em 0 o midrange dispara, em 2 o aggro
                            // dispara. 1 e onde os dois convivem.
    "refinoDureza": 2,      // NAO subir para 3: devolve o control mas joga o
                            // mid > control de volta para 45%.
    "exigirRefinoParaLiga": true,
    "barreiraPorRefino": 1, // regra de ouro do Thomas, nao se mexe
    "barreiraDureza": null, // 7 ajuda o combo mas afunda o aggro > mid para 30%
    "ligaRefinadasMin": 1,  // era null (exigia TODAS as pecas refinadas). Foi a
                            // regra que mais ajudou o midrange: +5,2 pontos.
    "refinoGratisNaMao": false,  // o P&D continua existindo, so deixou de ser
                                 // de graca.
    "bonusLiga": 4,
    "custoExtraRefinoMao": 0,

    // --- AS 4 CHAVES MESTRAS DE MECANICA ---
    "ligaEntraPronta": false,     // a liga DORME um turno. Sem impeto ela fica na
                                  // mesa em vez de virar explosao que encerra a
                                  // partida, e sobra tempo para forjar outra: o
                                  // combo sobe e forja MAIS ligas.
    "atacarImpedeRefinar": false, // medido: move 0,4 ponto. E ruido. Fica no mais
                                  // simples de explicar na feira.
    "refinoGastaAcao": false,     // NAO ligar: -3,8 ao aggro e +2,7 turnos.
    "refinoMaoImpedeJogar": false // idem: ruido.
  },

  "cartas": [

    /* custo 1 — o chão da curva. Não entram em liga. */
    {id:1, nome:"Agregados", bloco:"Construção Civil", custo:1, ataque:2, defesa:1, copias:4,
     elemento:"SiO₂", minerio:"Areia e brita", refinado:"Agregado classificado",
     frase:"Cada estrada e cada prédio começam aqui. Volume imenso, valor mínimo por tonelada."},
    {id:2, nome:"Calcário", bloco:"Construção Civil", custo:1, ataque:2, defesa:1, copias:4,
     elemento:"CaCO₃", minerio:"Calcita", refinado:"Cal e clínquer",
     frase:"Vira cimento e corrige a acidez do solo: sustenta a obra e a lavoura."},
    {id:3, nome:"Caulim", bloco:"Construção Civil", custo:1, ataque:1, defesa:2, copias:4,
     elemento:"Al₂Si₂O₅", minerio:"Caulinita", refinado:"Caulim beneficiado",
     frase:"Argila branca que dá lisura ao papel e corpo à cerâmica."},

    /* custo 2 — subprodutos baratos, e são peças de liga */
    {id:4, nome:"Molibdênio", bloco:"Alta Tecnologia", custo:2, ataque:1, defesa:3, copias:4,
     elemento:"Mo", minerio:"Molibdenita", refinado:"Óxido de molibdênio",
     frase:"Pouco no aço aguenta muita pressão e calor. Vem de carona com o cobre."},
    {id:5, nome:"Cobalto", bloco:"Transição Energética", custo:2, ataque:1, defesa:4, copias:4,
     elemento:"Co", minerio:"Laterita niquelífera", refinado:"Sulfato de cobalto",
     frase:"Estabiliza o cátodo da bateria. Setenta por cento da mina mundial está na RDC."},
    {id:6, nome:"Gipsita", bloco:"Construção Civil", custo:2, ataque:3, defesa:2, copias:4,
     elemento:"CaSO₄", minerio:"Gipsita", refinado:"Gesso calcinado",
     frase:"Do Araripe sai o gesso do país inteiro: parede, forro e molde."},

    /* custo 3 */
    {id:7, nome:"Manganês", bloco:"Transição Energética", custo:3, ataque:4, defesa:3, copias:4,
     elemento:"Mn", minerio:"Pirolusita", refinado:"Ferroliga de manganês",
     frase:"Nenhum aço existe sem ele: tira o oxigênio que deixaria o metal quebradiço."},
    {id:8, nome:"Lítio", bloco:"Transição Energética", custo:3, ataque:3, defesa:4, copias:4,
     elemento:"Li", minerio:"Espodumênio", refinado:"Carbonato de lítio",
     frase:"O mais leve dos metais guarda mais energia por quilo. Por isso a bateria cabe no carro."},
    {id:9, nome:"Cromo", bloco:"Alta Tecnologia", custo:3, ataque:2, defesa:5, copias:3,
     elemento:"Cr", minerio:"Cromita", refinado:"Ferrocromo",
     frase:"Forma um filme invisível que barra a ferrugem. Sem cromo não há aço inoxidável."},
    {id:10, nome:"Enxofre", bloco:"Segurança Alimentar", custo:3, ataque:2, defesa:5, copias:3,
     elemento:"S", minerio:"Pirita", refinado:"Ácido sulfúrico",
     frase:"Vira o ácido que dissolve a rocha fosfática. Sem ele o fertilizante não sai."},

    /* custo 4 — o eixo das ligas */
    {id:11, nome:"Ferro", bloco:"Alta Tecnologia", custo:4, ataque:5, defesa:4, copias:5,
     elemento:"Fe", minerio:"Hematita e itabirito", refinado:"Ferro-gusa e placa",
     frase:"Carajás tem o melhor teor do mundo. Sai do país como pó e volta como máquina."},
    {id:12, nome:"Grafita", bloco:"Transição Energética", custo:4, ataque:5, defesa:4, copias:3,
     elemento:"C", minerio:"Grafita em flocos", refinado:"Grafita esferoidizada",
     frase:"Lubrifica onde o óleo derrete e conduz onde o metal falha. Hoje é o ânodo da bateria."},
    {id:13, nome:"Níquel", bloco:"Transição Energética", custo:4, ataque:4, defesa:5, copias:3,
     elemento:"Ni", minerio:"Garnierita", refinado:"Níquel classe 1",
     frase:"Dá ao aço resistência ao calor e à corrosão, e ao cátodo mais autonomia."},
    {id:14, nome:"Estanho", bloco:"Transição Energética", custo:4, ataque:5, defesa:4, copias:2,
     elemento:"Sn", minerio:"Cassiterita", refinado:"Estanho refinado",
     frase:"Derrete a 232 graus e une sem queimar o circuito: toda solda eletrônica passa por ele."},
    {id:15, nome:"Potássio", bloco:"Segurança Alimentar", custo:4, ataque:1, defesa:8, copias:2,
     elemento:"K", minerio:"Silvinita", refinado:"Cloreto de potássio",
     frase:"A planta não enche o grão sem ele. Importamos 96% do que o agro consome."},
    {id:16, nome:"Vanádio", bloco:"Transição Energética", custo:4, ataque:4, defesa:5, copias:1,
     elemento:"V", minerio:"Magnetita titanífera", refinado:"Pentóxido de vanádio",
     frase:"Um quilo no aço economiza cem: deixa a viga mais fina e mais forte."},
    {id:17, nome:"Titânio", bloco:"Alta Tecnologia", custo:4, ataque:3, defesa:6, copias:1,
     elemento:"Ti", minerio:"Ilmenita e rutilo", refinado:"Esponja de titânio",
     frase:"Forte como aço e quase metade do peso. O corpo humano não o rejeita."},
    {id:18, nome:"Tungstênio", bloco:"Alta Tecnologia", custo:4, ataque:2, defesa:6, copias:1,
     elemento:"W", minerio:"Scheelita", refinado:"Carbeto de tungstênio",
     frase:"Derrete a 3.400 graus, mais que qualquer metal. É a ponta que fura e corta tudo."},

    /* custo 5 */
    {id:19, nome:"Cobre", bloco:"Transição Energética", custo:5, ataque:3, defesa:8, copias:3,
     elemento:"Cu", minerio:"Calcopirita", refinado:"Cobre catódico",
     frase:"Maleável e condutor, é o alicerce da eletrificação: cabo, fio, motor e transformador."},
    {id:20, nome:"Fosfato", bloco:"Segurança Alimentar", custo:5, ataque:4, defesa:7, copias:3,
     elemento:"P", minerio:"Apatita", refinado:"Superfosfato",
     frase:"Nenhuma raiz cresce sem fósforo, e ele não tem substituto químico nenhum."},
    {id:21, nome:"Urânio", bloco:"Segurança Energética", custo:5, ataque:6, defesa:6, copias:2,
     elemento:"U", minerio:"Uraninita", refinado:"Urânio enriquecido",
     frase:"Um grama rende como uma tonelada de carvão. Caetité, e só 30% do país prospectado."},
    {id:22, nome:"Magnésio", bloco:"Alta Tecnologia", custo:5, ataque:3, defesa:8, copias:1,
     elemento:"Mg", minerio:"Magnesita", refinado:"Magnésio metálico",
     frase:"O metal estrutural mais leve que existe, e o refratário que segura o forno do aço."},
    {id:23, nome:"Tântalo", bloco:"Alta Tecnologia", custo:5, ataque:6, defesa:5, copias:1,
     elemento:"Ta", minerio:"Tantalita", refinado:"Pó de tântalo",
     frase:"Guarda muita carga em pouco espaço: é o capacitor que cabe dentro do celular."},
    {id:24, nome:"Grupo da Platina", bloco:"Alta Tecnologia", custo:5, ataque:3, defesa:8, copias:1,
     elemento:"Pt, Pd", minerio:"Esperrilita", refinado:"Platina e paládio",
     frase:"Catalisa o que ninguém catalisa: limpa o escapamento e quebra a molécula de hidrogênio."},

    /* custo 6 — as estrelas */
    {id:25, nome:"Nióbio", bloco:"Transição Energética", custo:6, ataque:8, defesa:5, copias:3,
     elemento:"Nb", minerio:"Pirocloro", refinado:"Ferronióbio",
     frase:"Uma pitada deixa o aço mais leve e mais forte. Araxá responde por nove décimos do mundo."},
    {id:26, nome:"Terras Raras", bloco:"Transição Energética", custo:6, ataque:5, defesa:8, copias:3,
     elemento:"ETR", minerio:"Monazita e argila iônica", refinado:"Óxidos separados",
     frase:"Dezessete elementos parecidos e difíceis de separar. Fazem o ímã que move o carro elétrico."},
    {id:27, nome:"Alumínio", bloco:"Transição Energética", custo:6, ataque:6, defesa:7, copias:1,
     elemento:"Al", minerio:"Bauxita", refinado:"Alumina e alumínio",
     frase:"Leve, não enferruja e recicla infinitas vezes. Mas exige muita energia para nascer."},
    {id:28, nome:"Silício", bloco:"Transição Energética", custo:6, ataque:7, defesa:6, copias:1,
     elemento:"Si", minerio:"Quartzo", refinado:"Silício metálico",
     frase:"Areia purificada vira painel solar e chip. Quanto mais puro, mais caro o grama."},
  ],

  "ligas": [
    {nome:"Bateria de Íon-Lítio", cartas:["Lítio", "Cobalto"],
     refinado:"Cátodo NMC + ânodo de grafita",
     ensina:"Cátodo e cobalto: a química que move o carro elétrico."},
    {nome:"Carboneto de Tungstênio", cartas:["Tungstênio", "Cobalto"],
     refinado:"Metal duro (WC-Co)",
     ensina:"A ponta da broca que fura tudo."},
    {nome:"Aço-Molibdênio", cartas:["Ferro", "Molibdênio"],
     refinado:"Aço-liga ao molibdênio",
     ensina:"Um pouco de molibdênio endurece muito aço."},
    {nome:"Aço-Manganês", cartas:["Ferro", "Manganês"],
     refinado:"Aço Hadfield",
     ensina:"A liga do trilho e da britadeira."},
    {nome:"Aço Inoxidável", cartas:["Ferro", "Cromo"],
     refinado:"Aço inox série 400",
     ensina:"Cromo para o aço não enferrujar."},
    {nome:"Bronze", cartas:["Cobre", "Estanho"],
     refinado:"Liga cobre-estanho",
     ensina:"A liga que abriu a história humana."},
    {nome:"Fertilizante NPK", cartas:["Fosfato", "Potássio"],
     refinado:"Formulado NPK",
     ensina:"Dois minerais que o Brasil importa para poder plantar."},
    {nome:"Aço Microligado", cartas:["Ferro", "Nióbio"],
     refinado:"Aço HSLA ao nióbio",
     ensina:"A mais brasileira: Araxá no aço do mundo inteiro."},
    {nome:"Ímã de Neodímio", cartas:["Terras Raras", "Ferro"],
     refinado:"Ímã permanente NdFeB",
     ensina:"Sem ele não há motor elétrico nem aerogerador."},
  ]
};
if(typeof module==="object"&&module.exports)module.exports=D;else r.DADOS=D;
})(typeof self!=="undefined"?self:this);
