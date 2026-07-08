/* ════════════════════════════════════════════════════════════════════
   📦 CONFIG
   ════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  slidesPerMineral: 7,
  slideNames: ["Capa","Visão Geral","Números Mundiais","Cadeia no Brasil","Atores Globais","Cadeia Mineral","Depósitos"],
  imagePath:    "img/",
  imageExt:     "jpg",
  imagesEnabled: true,
  dataUrl:      "minerais.json"
};

/* ════════════════════════════════════════════════════════════════════
   📚 FONTES POR MINERAL — exibidas no rodapé dos slides de dados
   - pr = fonte de Produção / Reservas
   - tr = fonte de Transformação / Refino
   ════════════════════════════════════════════════════════════════════ */
const FONTES = {
  etr:        { pr: "USGS MCS 2026", tr: "IEA Global Critical Minerals Outlook 2025" },
  cobre:      { pr: "USGS MCS 2026", tr: "IEA Global Critical Minerals Outlook 2025" },
  litio:      { pr: "USGS MCS 2026", tr: "IEA Global Critical Minerals Outlook 2025" },
  uranio:     { pr: "WNA / USGS",    tr: "WNA / Euratom (enriquecimento)" },
  niquel:     { pr: "USGS MCS 2026", tr: "IEA Global Critical Minerals Outlook 2025" },
  grafita:    { pr: "USGS MCS 2026", tr: "IEA Global Critical Minerals Outlook 2025" },
  cobalto:    { pr: "USGS MCS 2026", tr: "IEA Global Critical Minerals Outlook 2025" },
  estanho:    { pr: "USGS MCS 2026", tr: "USGS FS 2025-3038" },
  niobio:     { pr: "USGS MCS 2026", tr: "USGS / CBMM" },
  manganes:   { pr: "USGS MCS 2025", tr: "Estimativa setorial — sulfato grau bateria" },
  tantalo:    { pr: "USGS MCS 2026", tr: "USGS (proxy de fontes de importação)" },
  zinco:      { pr: "USGS MCS 2025", tr: "USGS FS 2025-3038" },
  titanio:    { pr: "USGS MCS 2026", tr: "USGS FS 2025-3038" },
  platinideos:{ pr: "USGS MCS 2026", tr: "USGS FS 2025-3038 (Pt)" },
  potassio:   { pr: "USGS MCS 2026", tr: "NRCan 2024 (exportações globais)" },
  fosfato:    { pr: "USGS MCS 2026", tr: "IFA / estimativa setorial (ácido fosfórico)" }
};
const fonteDe = (m) => FONTES[m.slug] || { pr: "USGS 2026", tr: "USGS 2026" };
const fonteRodape = (m) => {
  const f = fonteDe(m);
  return `Prod./Reservas: ${f.pr} · Transformação: ${f.tr}`;
};

/* ════════════════════════════════════════════════════════════════════
   🎨 PALETA DE CORES — atribuída automaticamente
   - Países recorrentes têm cor fixa (consistência entre slides)
   - Brasil sempre laranja (cor da identidade)
   - Países não mapeados usam paleta sequencial por posição
   - "Outros" sempre cinza
   ════════════════════════════════════════════════════════════════════ */
const COUNTRY_COLORS = {
  "Brasil":         "#E8920D",
  "China":          "#D32F2F",
  "EUA":            "#1565C0",
  "Chile":          "#1565C0",
  "Austrália":      "#2E7D32",
  "R.D. Congo":     "#6A1B9A",
  "RDC":            "#1565C0",
  "Indonésia":      "#D32F2F",
  "Cazaquistão":    "#1565C0",
  "Canadá":         "#D32F2F",
  "Rússia":         "#6A1B9A",
  "Argentina":      "#F57F17",
  "Zimbábue":       "#F57F17",
  "Madagascar":     "#6A1B9A",
  "Moçambique":     "#1565C0",
  "Namíbia":        "#F57F17",
  "Peru":           "#2E7D32",
  "Myanmar":        "#6A1B9A",
  "Filipinas":      "#1565C0",
  "Tanzânia":       "#2E7D32",
  "Malásia":        "#F57F17",
  "Finlândia":      "#1565C0",
  "Japão":          "#2E7D32",
  "Europa*":        "#6A1B9A",
  "Belarus":        "#2E7D32",
  "Laos":           "#F57F17",
  "Alemanha":       "#00838F",
  "Marrocos":       "#6A1B9A",
  "Egito":          "#F57F17",
  "Tunísia":        "#00838F",
  "Jordânia":       "#2E7D32",
  "Outros":         "#BDBDBD"
};
// Paleta de fallback (caso apareça país novo não mapeado)
const FALLBACK_PALETTE = ["#1565C0","#2E7D32","#F57F17","#6A1B9A","#00838F","#5D4037","#AD1457"];

function colorFor(label, idx){
  if(COUNTRY_COLORS[label]) return COUNTRY_COLORS[label];
  return FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
}

// Aplica cor a um array {label, val} retornando {label, val, color}
function withColors(arr){
  return arr.map((it, i) => ({ ...it, color: colorFor(it.label, i) }));
}

/* ════════════════════════════════════════════════════════════════════
   📂 DADOS — carregados de minerais.json
   ════════════════════════════════════════════════════════════════════ */
let MINERAL_DATA = [];

/* ════════════════════════════════════════════════════════════════════
   🔧 RENDER ENGINE
   ════════════════════════════════════════════════════════════════════ */
let H = [], cM = 0, cS = 0;
const SN = CONFIG.slidesPerMineral;

const flag = (emoji) => `<span class="c-flag">${emoji}</span>`;
const totalSlides = () => MINERAL_DATA.length * SN;
const globalIndex = () => cM * SN + cS;

function buildHeader(m, slideTitle){
  return `<div class="slide-header">
    <div class="header-left">
      <div class="header-symbol">${m.simbolo}</div>
      <div>
        <div class="header-title">${slideTitle}</div>
        <div class="header-subtitle">${m.nome}</div>
      </div>
    </div>
    <div class="header-logo">Ministério de<br>Minas e Energia<br><span class="gov">Governo Federal</span></div>
  </div>`;
}

function buildStepper(){
  const items = CONFIG.slideNames.map((name, i) => {
    const active = i === cS ? ' active' : '';
    return `<button class="step-item${active}" onclick="goToSlide(${cM}, ${i})" title="${name}">
      <span class="step-dot"></span>
      <span class="step-label">${i + 1}. ${name}</span>
    </button>`;
  }).join('');
  return `<div class="slide-stepper" onclick="event.stopPropagation()">${items}</div>`;
}

function buildFooter(source){
  return `${buildStepper()}<div class="slide-footer">
    <div>Fonte: ${source || 'USGS 2026 / WNA / SNGM'}</div>
    <div>SNGM</div>
  </div>`;
}

/* Nota de rodapé opcional (campo notaRodape em cadeiaGlobal) —
   estilizada inline para não exigir mudança no CSS */
function buildChainNote(nota){
  if(!nota) return '';
  return `<div class="chain-note" style="padding:0 var(--pad-slide-x) 8px 76px;font-size:var(--fs-xs);color:var(--light);font-style:italic;line-height:1.4;flex-shrink:0">* ${nota}</div>`;
}

/* ════════════════════════════════════════════════════════════════════
   🥧 PIZZA EM SVG — vetorial, nítida na tela e na impressão
   (o conic-gradient anterior era rasterizado em baixa resolução no PDF)
   ════════════════════════════════════════════════════════════════════ */
function buildPie(rawData){
  const data = withColors(rawData);
  const C = 50, R = 50;
  let acc = 0;
  const slices = data.map(x => {
    if(x.val <= 0) return '';
    const a0 = (acc / 100) * 2 * Math.PI - Math.PI / 2;
    acc += x.val;
    const a1 = (acc / 100) * 2 * Math.PI - Math.PI / 2;
    if(x.val >= 99.9) return `<circle cx="${C}" cy="${C}" r="${R}" fill="${x.color}"/>`;
    const large = x.val > 50 ? 1 : 0;
    const x0 = (C + R * Math.cos(a0)).toFixed(3), y0 = (C + R * Math.sin(a0)).toFixed(3);
    const x1 = (C + R * Math.cos(a1)).toFixed(3), y1 = (C + R * Math.sin(a1)).toFixed(3);
    return `<path d="M${C} ${C} L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z" fill="${x.color}"/>`;
  }).join('');
  const legend = data.map(x =>
    `<div class="pie-legend-row">
      <div style="display:flex;align-items:center;min-width:0"><span class="pie-dot" style="background:${x.color}"></span>${x.label}</div>
      <span>${x.val}%</span>
    </div>`
  ).join('');
  return `<div class="pie-wrapper">
    <svg class="pie-container" viewBox="0 0 100 100" aria-hidden="true">${slices}</svg>
    <div class="pie-legend-box">${legend}</div>
  </div>`;
}

function buildBar(data){
  return '<div class="bar-chart-area">' + data.map(x => {
    const isBR = x.label === "Brasil";
    const cls = isBR ? 'is-br' : 'is-other';
    const w = Math.max(x.val, 1.5);
    return `<div class="transf-bar-row">
      <div class="transf-label" style="${isBR ? 'color:var(--orange)' : ''}">${x.label}</div>
      <div class="transf-bar-bg">
        <div class="transf-bar-fill ${cls}" style="width:${w}%">${x.val > 3 ? x.val + '%' : ''}</div>
      </div>
      ${x.val <= 3 ? `<span style="font-size:var(--fs-sm);font-weight:700;width:32px;${isBR ? 'color:var(--orange)' : ''}">${x.val}%</span>` : ''}
    </div>`;
  }).join('') + '</div>';
}

function listHTML(arr){
  return '<ul class="company-list">' + arr.map(i =>
    `<li>
      <div class="c-title">${flag(i.bandeira)}${i.pais}: ${i.emp}</div>
      <div class="c-meta">Opera: ${i.opera}</div>
    </li>`
  ).join('') + '</ul>';
}

function assetUrl(slug, tema){
  if(!CONFIG.imagesEnabled) return null;
  return `${CONFIG.imagePath}${slug}_${tema}.${CONFIG.imageExt}`;
}

function gapRow(label, val, isBR){
  const cls = isBR ? 'br-fill' : 'leader-fill';
  const color = isBR ? 'color:var(--orange)' : '';
  return `<div class="gap-chart">
    <div class="gap-label" style="${color}">${label}</div>
    <div class="gap-bar-bg"><div class="gap-bar-fill ${cls}" style="width:${Math.max(val, .5)}%"></div></div>
    <div class="gap-val" style="${color}">${val}%</div>
  </div>`;
}

function buildImageSlide(m, slideTitle, tema, icon, label){
  const url = assetUrl(m.slug, tema);
  const fallbackHtml = `<div><span class="icon">${icon}</span><div class="title">${label} — ${m.nome}</div><div class="hint">Imagem esperada: ${m.slug}_${tema}.${CONFIG.imageExt}</div></div>`;
  const content = url
    ? `<img src="${url}" alt="${label} — ${m.nome}" data-fallback="${encodeURIComponent(fallbackHtml)}" data-fallback-mode="outer">`
    : fallbackHtml;
  return `<div class="slide">${buildHeader(m, slideTitle)}
    <div class="slide-content">
      <div class="img-placeholder">${content}</div>
    </div>
    ${buildFooter()}
  </div>`;
}

/* ════════════════════════════════════════════════════════════════════
   ⛓️ CADEIA DE VALOR NO BRASIL — matriz elo × tempo (modelo IBRAM)
   - Campo opcional "cadeiaValor" no JSON: elos com faixa (up/mid/down/rec),
     presença hoje, PD&I e metas 2030/2050. Fallback: imagem <slug>_cadeia.jpg
   ════════════════════════════════════════════════════════════════════ */
function buildCadeiaValorSlide(m){
  const cv = m.cadeiaValor;
  const CORES = { up:'#1565C0', mid:'#E8920D', down:'#6E6E6E', rec:'#00838F' };
  const ROTULOS = { up:'Upstream', mid:'Midstream', down:'Downstream', rec:'Recuperação / reciclagem' };
  const hasPdi = cv.elos.some(e => e.pdi);

  const boxMeta = t => t ? `<div style="background:#E8F5E9;border:1.5px solid #2E7D32;border-radius:6px;padding:6px 8px;font-size:var(--fs-xs);line-height:1.3;color:#1B5E20;font-weight:600">${t}</div>` : '';
  const rows = cv.elos.map(e => {
    const faixa = CORES[e.faixa] || '#999';
    const hoje = e.hoje
      ? `<div style="background:#fff;border:2px solid var(--orange);border-radius:6px;padding:6px 8px;font-weight:700;font-size:var(--fs-xs);line-height:1.3">${e.hoje}</div>`
      : `<div style="color:#C9C7C2;font-weight:800;text-align:center;width:100%">—</div>`;
    const pdi = e.pdi ? `<div style="background:#E3F2FD;border:1.5px solid #1565C0;border-radius:6px;padding:6px 8px;font-size:var(--fs-xs);line-height:1.3;color:#0D47A1;font-weight:600">${e.pdi}</div>` : '';
    return `<div style="background:${faixa};border-radius:4px" title="${ROTULOS[e.faixa] || ''}"></div>
      <div style="background:#1A1A1A;color:#fff;border-radius:6px;padding:7px 9px;font-weight:700;font-size:var(--fs-xs);display:flex;align-items:center;line-height:1.25">${e.elo}</div>
      ${hasPdi ? `<div style="display:flex;align-items:center">${pdi}</div>` : ''}
      <div style="display:flex;align-items:center">${hoje}</div>
      <div style="display:flex;align-items:center">${boxMeta(e.m2030)}</div>
      <div style="display:flex;align-items:center">${boxMeta(e.m2050)}</div>`;
  }).join('');

  const head = t => `<div style="font-family:var(--font-display);font-weight:800;font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.6px;color:var(--gray);text-align:center;padding:2px 0">${t}</div>`;
  const cols = hasPdi ? '8px 1.5fr 1fr 1.15fr 1.15fr 1.15fr' : '8px 1.6fr 1.25fr 1.25fr 1.25fr';
  const headers = `<div></div>${head('Elo da cadeia')}${hasPdi ? head('PD&amp;I') : ''}${head('Hoje')}${head('2030')}${head('2050')}`;

  const usadas = Object.keys(CORES).filter(k => cv.elos.some(e => e.faixa === k));
  const legenda = usadas.map(k =>
    `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px;white-space:nowrap"><span style="width:12px;height:12px;border-radius:3px;background:${CORES[k]}"></span>${ROTULOS[k]}</span>`
  ).join('') + `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px;white-space:nowrap"><span style="width:12px;height:12px;border-radius:3px;background:#E8F5E9;border:1.5px solid #2E7D32"></span>Metas anunciadas</span>`;

  return `<div class="slide">${buildHeader(m, "Cadeia de Valor no Brasil")}
    <div class="slide-content">
      <div class="card" style="flex:1;min-height:0">
        <div class="card-badge">Elos da Cadeia — presença atual e metas</div>
        <div style="overflow:auto;flex:1;min-height:0">
          <div style="display:grid;grid-template-columns:${cols};gap:6px 8px;min-width:860px;align-content:start;padding-bottom:4px">
            ${headers}
            ${rows}
          </div>
        </div>
        <div style="font-size:var(--fs-xs);color:var(--gray);font-weight:600;margin-top:8px;flex-shrink:0;display:flex;flex-wrap:wrap;gap:4px;align-items:center">${legenda}</div>
        ${cv.obs ? `<div style="font-size:var(--fs-xs);color:var(--light);font-style:italic;margin-top:4px;flex-shrink:0">* ${cv.obs}</div>` : ''}
      </div>
    </div>
    ${buildFooter(cv.fonte || undefined)}
  </div>`;
}

function generateSlides(m){
  const S = [];
  const v = m.visaoGeral, n = m.numerosMundiais, c = m.cadeiaGlobal;

  /* Rótulos dinâmicos por mineral (campos opcionais no JSON):
     - n.labelTransf → título da barra de transformação (slide 3)
       e da seção de gap (slide 2). Ex.: "Exportações" (potássio),
       "Ácido Fosfórico" (fosfato), "Enriquecimento" (urânio).
     - c.etapasLabels → títulos das 3 colunas da cadeia global (slide 5).
     Minerais sem os campos caem no padrão (|| fallback). */
  const tLabel = n.labelTransf || null;
  const labels = c.etapasLabels || {};

  // ─── 1. CAPA ───
  const photoUrl = assetUrl(m.slug, 'capa');
  const placeholderHtml = `<div class="capa-photo-placeholder"><div><span class="icon">🪨</span>FOTO DO MINERAL<br><span style="font-size:var(--fs-sm);opacity:.7">${m.nome}</span></div></div>`;
  const capaPhoto = photoUrl
    ? `<img class="capa-photo-img" src="${photoUrl}" alt="${m.nome}" data-fallback="${encodeURIComponent(placeholderHtml)}" data-fallback-mode="parent">`
    : placeholderHtml;

  S.push(`<div class="slide slide-capa">
    <div class="capa-photo-wrapper">${capaPhoto}</div>
    <div class="capa-glass">
      <div class="capa-symbol-tag">${m.simbolo}</div>
      <h1>${m.nome}</h1>
      <p class="sub">Visão geológica e geoconômica</p>
    </div>
    <div class="capa-footer-bar"></div>
  </div>`);

  // ─── 2. VISÃO GERAL ───
  const empUrl = assetUrl(m.slug, 'empreendimento');
  const empFallback = `<div class="emp-photo-fallback">Foto: ${m.slug}_empreendimento.${CONFIG.imageExt}</div>`;
  const empHtml = empUrl
    ? `<img class="emp-photo" src="${empUrl}" alt="Empreendimento — ${m.nome}" data-fallback="${encodeURIComponent(empFallback)}" data-fallback-mode="outer">`
    : empFallback;

  S.push(`<div class="slide">${buildHeader(m, "Visão Geral e Posição Nacional")}
    <div class="slide-content s2-layout">
      <div class="s2-col">
        <div class="card">
          <div class="card-badge">Principais Usos</div>
          <div class="text-body">${v.usos}</div>
        </div>
        <div class="card" style="flex:1">
          <div class="card-badge">Posição do Brasil</div>
          <div class="pos-grid">
            <div class="pos-item"><div class="pos-label">Reserva</div><div class="pos-val">${v.posicaoBR.reserva}</div></div>
            <div class="pos-item"><div class="pos-label">Produção</div><div class="pos-val">${v.posicaoBR.producao}</div></div>
          </div>
          <div class="text-body" style="font-size:var(--fs-sm);margin-top:9px">
            <strong>Reservas:</strong> ${v.estadosRes}<br>
            <strong>Produção:</strong> ${v.estadosProd}
          </div>
          <div class="gap-area">
            <div class="gap-section-label">Produção Mundial (%)</div>
            ${gapRow('Brasil', v.gapProd.br, true)}
            ${gapRow(v.gapProd.leaderName, v.gapProd.leader, false)}
            <div class="gap-section-label">Reservas Mundiais (%)</div>
            ${gapRow('Brasil', v.gapRes.br, true)}
            ${gapRow(v.gapRes.leaderName, v.gapRes.leader, false)}
            <div class="gap-section-label">${tLabel || 'Transformação'} (%)</div>
            ${gapRow('Brasil', v.gapTransf.br, true)}
            ${gapRow(v.gapTransf.leaderName, v.gapTransf.leader, false)}
          </div>
        </div>
      </div>
      <div class="s2-col">
        <div class="card" style="flex:1">
          <div class="card-badge">Empreendimento de Destaque</div>
          ${empHtml}
          <div class="text-body">${v.destaque}</div>
        </div>
      </div>
    </div>
    ${buildFooter(fonteRodape(m))}
  </div>`);

  // ─── 3. NÚMEROS MUNDIAIS ───
  const flags = n.quemManda.map(q =>
    `<div class="flag-box">
      <div class="flag-emoji">${q.bandeira}</div>
      <div class="flag-label">${q.etapa}</div>
      <div class="flag-country">${q.pais}</div>
    </div>`
  ).join('');
  S.push(`<div class="slide">${buildHeader(m, "Números Mundiais")}
    <div class="slide-content grid-pizza">
      <div class="s2-col" style="gap:var(--gap-cards)">
        <div class="card" style="flex:1"><div class="card-badge">Produção Mundial</div>${buildPie(n.pieProd)}</div>
        <div class="card" style="flex:1"><div class="card-badge">Reservas Mundiais</div>${buildPie(n.pieRes)}</div>
      </div>
      <div class="s2-col" style="gap:var(--gap-cards)">
        <div class="card"><div class="card-badge">${tLabel || 'Transformação / Refino'}</div><div style="margin-top:8px">${buildBar(n.barTransf)}</div></div>
        <div class="card" style="flex:1"><div class="card-badge">Líderes por Etapa</div><div class="flags-grid">${flags}</div></div>
      </div>
    </div>
    ${buildFooter(fonteRodape(m))}
  </div>`);

  // ─── 4. CADEIA DE VALOR ───
  if(m.cadeiaValor && m.cadeiaValor.elos){
    S.push(buildCadeiaValorSlide(m));
  } else {
    S.push(buildImageSlide(m, "Cadeia de Valor no Brasil", "cadeia", "⛓️", "Cadeia de Valor"));
  }

  // ─── 5. CADEIA GLOBAL ───
  S.push(`<div class="slide">${buildHeader(m, "Cadeia Global e Geopolítica")}
    <div class="slide-content grid-4">
      <div class="card"><div class="card-badge">${labels.extracao || 'Extração'}</div>${listHTML(c.extracao)}</div>
      <div class="card"><div class="card-badge">${labels.refino || 'Refino / Midstream'}</div>${listHTML(c.refino)}</div>
      <div class="card"><div class="card-badge">${labels.manufatura || 'Manufatura / Downstream'}</div>${listHTML(c.manufatura)}</div>
      <div class="card-highlight"><div class="card-badge">Análise Estratégica</div><div class="text-body" style="font-size:var(--fs-sm)">${c.analise}</div></div>
    </div>
    ${buildChain
