/* Gerado por exportar.py a partir de jogo_minerais_balanceamento.xlsx — nao editar a mao */
(function(r){var D={
 "regras": {
  "reserva": 15,
  "baralho": 18,
  "maoInicial": 3,
  "maoSegundo": 5,
  "baralhoSegundoExtra": 2,
  "energiaInicial": 2,
  "energiaMax": 9,
  "campoMax": 3,
  "maoMax": 8,
  "custoEspeculacao": 1,
  "garantiaCusto": 2,
  "bonusLiga": 2,
  "refinoDivisor": 3,
  "refinoMin": 2,
  "refinoValor": 2,
  "refinoDureza": 1,
  "barreiraPorRefino": 1,
  "refinoGastaAcao": 0,
  "fichaSegundo": [
   2,
   1
  ]
 },
 "cartas": [
  {
   "id": 1,
   "nome": "Enxofre",
   "bloco": "I",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Enxofre nativo",
   "formula": "S",
   "elemento": "S",
   "mohs": 2,
   "preco": 100,
   "base": "Enxofre bruto",
   "ataque": 1,
   "defesa": 2,
   "custo": 2,
   "copias": 2,
   "nota": ""
  },
  {
   "id": 2,
   "nome": "Minerio de Fosfato",
   "bloco": "I",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Apatita",
   "formula": "Ca5(PO4)3(F,OH)",
   "elemento": "P",
   "mohs": 5,
   "preco": 300,
   "base": "Concentrado fosfatico",
   "ataque": 2,
   "defesa": 5,
   "custo": 4,
   "copias": 2,
   "nota": ""
  },
  {
   "id": 3,
   "nome": "Minerio de Potassio",
   "bloco": "I",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Silvita",
   "formula": "KCl",
   "elemento": "K",
   "mohs": 2,
   "preco": 320,
   "base": "Cloreto de potassio (KCl)",
   "ataque": 2,
   "defesa": 2,
   "custo": 2,
   "copias": 2,
   "nota": ""
  },
  {
   "id": 4,
   "nome": "Minerio de Molibdenio",
   "bloco": "I",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Molibdenita",
   "formula": "MoS2",
   "elemento": "Mo",
   "mohs": 1.25,
   "preco": 40000,
   "base": "Molibdenio metalico",
   "ataque": 5,
   "defesa": 1,
   "custo": 3,
   "copias": 2,
   "nota": "Mohs 1-1,5: risca com a unha. Canhao de vidro."
  },
  {
   "id": 5,
   "nome": "Minerio de Cobalto",
   "bloco": "II",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Asbolana (laterita niquelifera)",
   "formula": "(Mn,Co)O(OH)2.nH2O",
   "elemento": "Co",
   "mohs": 2.5,
   "preco": 30000,
   "base": "Cobalto refinado",
   "ataque": 5,
   "defesa": 3,
   "custo": 4,
   "copias": 3,
   "nota": "So existe como SUBPRODUTO de niquel no Brasil - nao ha mina propria. Fase portadora na zona limonitica."
  },
  {
   "id": 6,
   "nome": "Minerio de Cobre",
   "bloco": "II",
   "duplo": "III",
   "oficial": "Sim",
   "mineral": "Calcopirita",
   "formula": "CuFeS2",
   "elemento": "Cu",
   "mohs": 3.75,
   "preco": 9200,
   "base": "Cobre refinado",
   "ataque": 4,
   "defesa": 4,
   "custo": 4,
   "copias": 4,
   "nota": "Bloco duplo."
  },
  {
   "id": 7,
   "nome": "Minerio de Estanho",
   "bloco": "II",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Cassiterita",
   "formula": "SnO2",
   "elemento": "Sn",
   "mohs": 6.5,
   "preco": 31000,
   "base": "Estanho refinado",
   "ataque": 5,
   "defesa": 7,
   "custo": 6,
   "copias": 3,
   "nota": "Pitinga (AM) e Bom Futuro (RO)."
  },
  {
   "id": 8,
   "nome": "Minerio de Grafita",
   "bloco": "II",
   "duplo": "III",
   "oficial": "Sim",
   "mineral": "Grafita",
   "formula": "C",
   "elemento": "C",
   "mohs": 1.5,
   "preco": 650,
   "base": "Grafita natural em flocos",
   "ataque": 2,
   "defesa": 2,
   "custo": 2,
   "copias": 4,
   "nota": "Bloco duplo."
  },
  {
   "id": 9,
   "nome": "Minerios do grupo da platina",
   "bloco": "II",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Esperrilita",
   "formula": "PtAs2",
   "elemento": "Pt, Pd",
   "mohs": 6.5,
   "preco": 32000000,
   "base": "Platina",
   "ataque": 9,
   "defesa": 7,
   "custo": 8,
   "copias": 3,
   "nota": ""
  },
  {
   "id": 10,
   "nome": "Minerio de Litio",
   "bloco": "II",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Espodumenio",
   "formula": "LiAlSi2O6",
   "elemento": "Li",
   "mohs": 6.75,
   "preco": 12000,
   "base": "Carbonato de litio equiv.",
   "ataque": 4,
   "defesa": 7,
   "custo": 6,
   "copias": 3,
   "nota": "Vale do Jequitinhonha (MG)."
  },
  {
   "id": 11,
   "nome": "Minerio de Niobio",
   "bloco": "II",
   "duplo": "III",
   "oficial": "Sim",
   "mineral": "Pirocloro",
   "formula": "(Na,Ca)2Nb2O6(OH,F)",
   "elemento": "Nb",
   "mohs": 5.25,
   "preco": 45000,
   "base": "Ferronióbio",
   "ataque": 5,
   "defesa": 5,
   "custo": 5,
   "copias": 3,
   "nota": "Bloco duplo. Brasil ~90% da oferta mundial."
  },
  {
   "id": 12,
   "nome": "Minerio de Niquel",
   "bloco": "II",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Garnierita",
   "formula": "(Ni,Mg)3Si2O5(OH)4",
   "elemento": "Ni",
   "mohs": 3,
   "preco": 16000,
   "base": "Niquel refinado",
   "ataque": 4,
   "defesa": 3,
   "custo": 4,
   "copias": 3,
   "nota": "Laterita, que e o que o Brasil lavra."
  },
  {
   "id": 13,
   "nome": "Minerio de Silicio",
   "bloco": "II",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Quartzo",
   "formula": "SiO2",
   "elemento": "Si",
   "mohs": 7,
   "preco": 2200,
   "base": "Silicio metalico",
   "ataque": 3,
   "defesa": 7,
   "custo": 5,
   "copias": 3,
   "nota": ""
  },
  {
   "id": 14,
   "nome": "Minerio de Tantalo",
   "bloco": "II",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Columbita-tantalita",
   "formula": "(Fe,Mn)(Nb,Ta)2O6",
   "elemento": "Ta",
   "mohs": 6.25,
   "preco": 200000,
   "base": "Tantalo metalico",
   "ataque": 6,
   "defesa": 6,
   "custo": 6,
   "copias": 3,
   "nota": ""
  },
  {
   "id": 15,
   "nome": "Minerio de Terras Raras",
   "bloco": "II",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Argila ionica",
   "formula": "(adsorcao ionica em argilominerais)",
   "elemento": "ETR",
   "mohs": 1.5,
   "preco": 80000,
   "base": "Oxidos de terras raras",
   "ataque": 5,
   "defesa": 2,
   "custo": 4,
   "copias": 3,
   "nota": "Argila ionica, nao monazita: e a rota estrategica atual (Goias)."
  },
  {
   "id": 16,
   "nome": "Minerio de Titanio",
   "bloco": "II",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Ilmenita",
   "formula": "FeTiO3",
   "elemento": "Ti",
   "mohs": 5.5,
   "preco": 8000,
   "base": "Titanio esponja",
   "ataque": 4,
   "defesa": 6,
   "custo": 5,
   "copias": 3,
   "nota": ""
  },
  {
   "id": 17,
   "nome": "Minerio de Tungstenio",
   "bloco": "II",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Scheelita",
   "formula": "CaWO4",
   "elemento": "W",
   "mohs": 4.75,
   "preco": 35000,
   "base": "Tungstenio (APT)",
   "ataque": 5,
   "defesa": 5,
   "custo": 5,
   "copias": 3,
   "nota": "Currais Novos (RN)."
  },
  {
   "id": 18,
   "nome": "Minerio de Uranio",
   "bloco": "II",
   "duplo": "III",
   "oficial": "Sim",
   "mineral": "Uraninita",
   "formula": "UO2",
   "elemento": "U",
   "mohs": 5.5,
   "preco": 176000,
   "base": "U3O8",
   "ataque": 6,
   "defesa": 6,
   "custo": 6,
   "copias": 3,
   "nota": "Bloco duplo. Caetite (BA)."
  },
  {
   "id": 19,
   "nome": "Minerio de Vanadio",
   "bloco": "II",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Magnetita vanadifera",
   "formula": "(Fe,V)3O4",
   "elemento": "V",
   "mohs": 6,
   "preco": 9000,
   "base": "Pentoxido de vanadio",
   "ataque": 4,
   "defesa": 6,
   "custo": 5,
   "copias": 3,
   "nota": "Maracas (BA)."
  },
  {
   "id": 20,
   "nome": "Minerio de Cromo",
   "bloco": "II",
   "duplo": "",
   "oficial": "COMPLEMENTAR",
   "mineral": "Cromita",
   "formula": "FeCr2O4",
   "elemento": "Cr",
   "mohs": 5.5,
   "preco": 2000,
   "base": "Ferrocromo",
   "ataque": 3,
   "defesa": 6,
   "custo": 5,
   "copias": 3,
   "nota": "NAO consta na Resolucao 2/2021. Incluida para viabilizar o aco inoxidavel. Campo Formoso (BA)."
  },
  {
   "id": 21,
   "nome": "Minerio de Zinco",
   "bloco": "II",
   "duplo": "",
   "oficial": "COMPLEMENTAR",
   "mineral": "Esfalerita",
   "formula": "ZnS",
   "elemento": "Zn",
   "mohs": 3.75,
   "preco": 2700,
   "base": "Zinco refinado",
   "ataque": 3,
   "defesa": 4,
   "custo": 4,
   "copias": 3,
   "nota": "NAO consta na Resolucao 2/2021. Incluida para viabilizar latao e galvanizacao. Vazante (MG)."
  },
  {
   "id": 22,
   "nome": "Minerio de Aluminio",
   "bloco": "III",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Gibbsita (bauxita)",
   "formula": "Al(OH)3",
   "elemento": "Al",
   "mohs": 2.75,
   "preco": 2450,
   "base": "Aluminio primario",
   "ataque": 3,
   "defesa": 3,
   "custo": 2,
   "copias": 4,
   "nota": ""
  },
  {
   "id": 23,
   "nome": "Minerio de Ferro",
   "bloco": "III",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Hematita",
   "formula": "Fe2O3",
   "elemento": "Fe",
   "mohs": 6,
   "preco": 105,
   "base": "Minerio de ferro",
   "ataque": 1,
   "defesa": 6,
   "custo": 3,
   "copias": 5,
   "nota": "Parede barata: pouco ataque, muita defesa."
  },
  {
   "id": 24,
   "nome": "Minerio de Ouro",
   "bloco": "III",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Ouro nativo",
   "formula": "Au",
   "elemento": "Au",
   "mohs": 2.75,
   "preco": 70000000,
   "base": "Ouro",
   "ataque": 9,
   "defesa": 3,
   "custo": 5,
   "copias": 4,
   "nota": ""
  },
  {
   "id": 25,
   "nome": "Minerio de Manganes",
   "bloco": "III",
   "duplo": "",
   "oficial": "Sim",
   "mineral": "Pirolusita",
   "formula": "MnO2",
   "elemento": "Mn",
   "mohs": 6.25,
   "preco": 320,
   "base": "Minerio de manganes",
   "ataque": 2,
   "defesa": 6,
   "custo": 3,
   "copias": 4,
   "nota": ""
  }
 ],
 "ligas": [
  {
   "nome": "Aco",
   "cartas": [
    "Ferro",
    "Grafita"
   ],
   "ensina": "Fe + C: a liga base da industria."
  },
  {
   "nome": "Aco inoxidavel",
   "cartas": [
    "Ferro",
    "Cromo",
    "Niquel"
   ],
   "ensina": "Fe + Cr + Ni: o cromo forma a camada passiva que impede a ferrugem."
  },
  {
   "nome": "Ferro-niobio",
   "cartas": [
    "Ferro",
    "Niobio"
   ],
   "ensina": "Fe + Nb: microliga de alta resistencia. A carta-simbolo do Brasil."
  },
  {
   "nome": "Ferrossilicio",
   "cartas": [
    "Ferro",
    "Silicio"
   ],
   "ensina": "Fe + Si: desoxidante siderurgico e aco eletrico."
  },
  {
   "nome": "Ferrovanadio",
   "cartas": [
    "Ferro",
    "Vanadio"
   ],
   "ensina": "Fe + V: aco HSLA, vergalhao e mola."
  },
  {
   "nome": "Aco rapido (HSS)",
   "cartas": [
    "Ferro",
    "Tungstenio",
    "Molibdenio"
   ],
   "ensina": "Fe + W + Mo: mantem dureza em alta temperatura."
  },
  {
   "nome": "Galvanizacao",
   "cartas": [
    "Ferro",
    "Zinco"
   ],
   "ensina": "Fe + Zn: o zinco se corroi no lugar do aco - protecao catodica."
  },
  {
   "nome": "Bronze",
   "cartas": [
    "Cobre",
    "Estanho"
   ],
   "ensina": "Cu + Sn: a liga que nomeia uma era."
  },
  {
   "nome": "Latao",
   "cartas": [
    "Cobre",
    "Zinco"
   ],
   "ensina": "Cu + Zn: conexao eletrica e hidraulica."
  },
  {
   "nome": "Solda sem chumbo",
   "cartas": [
    "Estanho",
    "Cobre"
   ],
   "ensina": "Sn + Cu: eletronica moderna, apos a restricao ao chumbo."
  },
  {
   "nome": "Duraluminio",
   "cartas": [
    "Aluminio",
    "Cobre"
   ],
   "ensina": "Al + Cu: leveza estrutural, base da aeronautica."
  },
  {
   "nome": "Liga Ti-6Al-4V",
   "cartas": [
    "Titanio",
    "Aluminio",
    "Vanadio"
   ],
   "ensina": "Ti + Al + V: implante e aeroespacial. As tres na lista oficial."
  },
  {
   "nome": "Carbeto de tungstenio",
   "cartas": [
    "Tungstenio",
    "Grafita"
   ],
   "ensina": "W + C: ferramenta de corte, dureza proxima a do diamante."
  },
  {
   "nome": "Silicio metalico",
   "cartas": [
    "Silicio",
    "Grafita"
   ],
   "ensina": "SiO2 + C: reducao carbotermica. O carbono e reagente, nao liga."
  },
  {
   "nome": "Ima de neodimio (NdFeB)",
   "cartas": [
    "Terras Raras",
    "Ferro"
   ],
   "ensina": "ETR + Fe: motor eletrico e gerador eolico."
  },
  {
   "nome": "Bateria de ion-litio (NMC)",
   "cartas": [
    "Litio",
    "Niquel",
    "Cobalto"
   ],
   "ensina": "Li + Ni + Co: o coracao da transicao energetica."
  },
  {
   "nome": "Anodo de bateria",
   "cartas": [
    "Grafita",
    "Litio"
   ],
   "ensina": "C + Li: o outro lado da celula."
  },
  {
   "nome": "Capacitor de tantalo",
   "cartas": [
    "Tantalo",
    "Manganes"
   ],
   "ensina": "Ta + MnO2: o catodo do capacitor. Todo celular tem."
  },
  {
   "nome": "Catalisador automotivo",
   "cartas": [
    "Platina",
    "Aluminio"
   ],
   "ensina": "PGM sobre alumina: converte o gas de escape."
  },
  {
   "nome": "Fertilizante NPK",
   "cartas": [
    "Fosfato",
    "Potassio"
   ],
   "ensina": "P + K: seguranca alimentar. O Brasil importa a maior parte."
  },
  {
   "nome": "Superfosfato",
   "cartas": [
    "Enxofre",
    "Fosfato"
   ],
   "ensina": "S + P: acido sulfurico ataca a rocha fosfatica."
  }
 ]
};
if(typeof module==="object"&&module.exports)module.exports=D;else r.DADOS=D;
})(typeof self!=="undefined"?self:this);
