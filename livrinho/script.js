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

function buildPie(rawData){
  const data = withColors(rawData);
  let stops = [], acc = 0;
  data.forEach(x => { stops.push(`${x.color} ${acc}% ${acc + x.val}%`); acc += x.val });
  const legend = data.map(x =>
    `<div class="pie-legend-row">
      <div style="display:flex;align-items:center;min-width:0"><span class="pie-dot" style="background:${x.color}"></span>${x.label}</div>
      <span>${x.val}%</span>
    </div>`
  ).join('');
  return `<div class="pie-wrapper">
    <div class="pie-container" style="background:conic-gradient(${stops.join(',')})"></div>
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

function generateSlides(m){
  const S = [];
  const v = m.visaoGeral, n = m.numerosMundiais, c = m.cadeiaGlobal;

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
            <div class="gap-section-label">Transformação (%)</div>
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
    ${buildFooter('USGS 2026')}
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
        <div class="card"><div class="card-badge">Transformação / Refino</div><div style="margin-top:8px">${buildBar(n.barTransf)}</div></div>
        <div class="card" style="flex:1"><div class="card-badge">Líderes por Etapa</div><div class="flags-grid">${flags}</div></div>
      </div>
    </div>
    ${buildFooter('USGS 2026')}
  </div>`);

  // ─── 4. CADEIA DE VALOR ───
  S.push(buildImageSlide(m, "Cadeia de Valor no Brasil", "cadeia", "⛓️", "Cadeia de Valor"));

  // ─── 5. CADEIA GLOBAL ───
  S.push(`<div class="slide">${buildHeader(m, "Cadeia Global e Geopolítica")}
    <div class="slide-content grid-4">
      <div class="card"><div class="card-badge">Extração</div>${listHTML(c.extracao)}</div>
      <div class="card"><div class="card-badge">Refino / Midstream</div>${listHTML(c.refino)}</div>
      <div class="card"><div class="card-badge">Manufatura / Downstream</div>${listHTML(c.manufatura)}</div>
      <div class="card-highlight"><div class="card-badge">Análise Estratégica</div><div class="text-body" style="font-size:var(--fs-sm)">${c.analise}</div></div>
    </div>
    ${buildFooter()}
  </div>`);

  // ─── 6. FLUXOGRAMA ───
  S.push(buildImageSlide(m, "Fluxograma de Transformação", "fluxo", "🔀", "Fluxograma"));

  // ─── 7. MAPA ───
  S.push(buildImageSlide(m, "Mapa de Ocorrências", "mapa", "🗺️", "Mapa"));

  return S;
}

/* ════════════════════════════════════════════════════════════════════
   🎨 BACKGROUND DE CONTORNOS
   ════════════════════════════════════════════════════════════════════ */
const CONTOUR_BG = (() => {
  const cache = {};
  const perm = new Uint8Array(512);
  const grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
  (function seed(s){let r=s||42;const p=new Uint8Array(256);for(let i=0;i<256;i++)p[i]=i;for(let i=255;i>0;i--){r=(r*1664525+1013904223)>>>0;const j=r%(i+1);[p[i],p[j]]=[p[j],p[i]]}for(let i=0;i<512;i++)perm[i]=p[i&255]})(42);
  function fade(t){return t*t*t*(t*(t*6-15)+10)}
  function lerp(a,b,t){return a+(b-a)*t}
  function dot2(g,x,y){return g[0]*x+g[1]*y}
  function noise2(x,y){const X=Math.floor(x)&255,Y=Math.floor(y)&255;x-=Math.floor(x);y-=Math.floor(y);const u=fade(x),v=fade(y);const a=perm[X]+Y,b=perm[X+1]+Y;return lerp(lerp(dot2(grad3[perm[a]%12],x,y),dot2(grad3[perm[b]%12],x-1,y),u),lerp(dot2(grad3[perm[a+1]%12],x,y-1),dot2(grad3[perm[b+1]%12],x-1,y-1),u),v)}
  function fbm(x,y){let v=0,amp=1,freq=1,max=0;for(let i=0;i<5;i++){v+=noise2(x*freq,y*freq)*amp;max+=amp;amp*=0.52;freq*=2}return v/max}
  function lerp01(x1,y1,x2,y2,v1,v2,t){if(Math.abs(v2-v1)<1e-9)return[(x1+x2)/2,(y1+y2)/2];const r2=(t-v1)/(v2-v1);return[x1+(x2-x1)*r2,y1+(y2-y1)*r2]}
  function generate(w,h){
    const key=w+'x'+h;if(cache[key])return cache[key];
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;
    const ctx=cv.getContext('2d');
    ctx.fillStyle='#F0EFEC';ctx.fillRect(0,0,w,h);
    const sc=0.0022;
    const GW=Math.ceil(w/8)+2,GH=Math.ceil(h/8)+2;
    const cW=w/(GW-1),cH=h/(GH-1);
    const grid=[];
    for(let r=0;r<GH;r++){const row=[];for(let c=0;c<GW;c++){row.push(fbm((c*cW)*sc,(r*cH)*sc))}grid.push(row)}
    let mn=Infinity,mx=-Infinity;
    for(let r=0;r<GH;r++)for(let c=0;c<GW;c++){if(grid[r][c]<mn)mn=grid[r][c];if(grid[r][c]>mx)mx=grid[r][c]}
    const N=24;
    for(let l=1;l<N;l++){
      const frac=l/N;const threshold=mn+(mx-mn)*frac;
      const isAccent=(l%5===0);
      const base=Math.round(170+frac*30);
      const alpha=isAccent?0.45:0.22;
      ctx.strokeStyle=`rgba(${base-20},${base-10},${base-25},${alpha})`;
      ctx.lineWidth=isAccent?1.2:0.5;
      ctx.lineJoin='round';ctx.lineCap='round';
      const segs=[];
      for(let row=0;row<GH-1;row++){for(let col=0;col<GW-1;col++){
        const tl=grid[row][col],tr=grid[row][col+1],bl=grid[row+1][col],br=grid[row+1][col+1];
        const idx=(tl>=threshold?8:0)|(tr>=threshold?4:0)|(br>=threshold?2:0)|(bl>=threshold?1:0);
        if(idx===0||idx===15)continue;
        const top=lerp01(col,row,col+1,row,tl,tr,threshold);
        const right=lerp01(col+1,row,col+1,row+1,tr,br,threshold);
        const bot=lerp01(col+1,row+1,col,row+1,br,bl,threshold);
        const left=lerp01(col,row+1,col,row,bl,tl,threshold);
        const cases={1:[left,bot],2:[bot,right],3:[left,right],4:[top,right],5:[top,right,left,bot],6:[top,bot],7:[top,left],8:[top,left],9:[top,bot],10:[top,left,bot,right],11:[top,right],12:[left,right],13:[bot,right],14:[left,bot]};
        const pts=cases[idx];if(!pts)continue;
        for(let i=0;i<pts.length;i+=2)segs.push({x1:pts[i][0],y1:pts[i][1],x2:pts[i+1][0],y2:pts[i+1][1]});
      }}
      ctx.beginPath();
      for(const s of segs){ctx.moveTo(s.x1*cW,s.y1*cH);ctx.lineTo(s.x2*cW,s.y2*cH)}
      ctx.stroke();
    }
    return cache[key] = cv.toDataURL('image/jpg');
  }
  return { generate };
})();

let bgCache = null, bgPrintCache = null;
function injectBg(){
  if(!bgCache){
    const w = Math.min(window.innerWidth, 1920);
    const h = Math.min(window.innerHeight, 1080);
    bgCache = CONTOUR_BG.generate(w, h);
  }
  document.querySelectorAll('#sc .slide:not(.slide-capa)').forEach(sl => {
    if(!sl.querySelector('.slide-bg')){
      const bg = document.createElement('div');
      bg.className = 'slide-bg';
      bg.style.backgroundImage = `url(${bgCache})`;
      bg.style.backgroundSize = 'cover';
      bg.style.backgroundPosition = 'center';
      sl.prepend(bg);
    }
  });
}

/* ════════════════════════════════════════════════════════════════════
   🎮 NAVEGAÇÃO
   ════════════════════════════════════════════════════════════════════ */
function buildSlides(){
  H = [];
  MINERAL_DATA.forEach(m => H.push(...generateSlides(m)));
}

function showError(msg){
  document.getElementById('sc').innerHTML =
    `<div style="display:flex;align-items:center;justify-content:center;width:100%;color:#fff;padding:40px;text-align:center;font-family:var(--font-display)">
      <div style="background:rgba(0,0,0,.5);padding:32px 40px;border-radius:14px;border:1px solid rgba(255,255,255,.15);max-width:560px">
        <div style="font-size:48px;margin-bottom:14px">⚠️</div>
        <div style="font-size:20px;font-weight:700;margin-bottom:10px">Não foi possível carregar os dados</div>
        <div style="font-size:14px;font-weight:400;line-height:1.5;color:rgba(255,255,255,.75)">${msg}</div>
      </div>
    </div>`;
}

async function init(){
  try{
    const res = await fetch(CONFIG.dataUrl, { cache: 'no-cache' });
    if(!res.ok) throw new Error(`HTTP ${res.status} ao carregar ${CONFIG.dataUrl}`);
    MINERAL_DATA = await res.json();
    if(!Array.isArray(MINERAL_DATA) || MINERAL_DATA.length === 0)
      throw new Error('JSON vazio ou inválido');
  }catch(err){
    console.error('[SNGM] Falha ao carregar dados:', err);
    const isFile = location.protocol === 'file:';
    const hint = isFile
      ? 'Você abriu o arquivo direto pelo navegador (file://). Por segurança, o navegador bloqueia o fetch local. Sirva a pasta com um servidor simples — ex: <code style="background:rgba(255,255,255,.1);padding:2px 6px;border-radius:4px">python -m http.server</code> e acesse via http://localhost:8000.'
      : `Verifique se o arquivo <code style="background:rgba(255,255,255,.1);padding:2px 6px;border-radius:4px">${CONFIG.dataUrl}</code> está na mesma pasta do HTML.<br><br><strong>Erro:</strong> ${err.message}`;
    showError(hint);
    return false;
  }
  return true;
}

// Minerais expandidos manualmente pelo usuário (via chevron).
// O accordion abre/fecha SOMENTE por clique no chevron — o mineral ativo
// não abre mais automaticamente.
const expandedMinerals = new Set();

function toggleMineralExpand(idx, ev){
  if(ev){ ev.stopPropagation(); ev.preventDefault(); }
  if(expandedMinerals.has(idx)) expandedMinerals.delete(idx);
  else expandedMinerals.add(idx);
  renderSidebarMenu();
}

function isGroupOpen(idx){
  // Aberto somente se o usuário expandiu manualmente (clicou no chevron).
  return expandedMinerals.has(idx);
}

function renderSidebarMenu(){
  document.getElementById('mt').innerHTML = MINERAL_DATA.map((m, i) => {
    const isActive = i === cM;
    const isOpen = isGroupOpen(i);
    const subItems = CONFIG.slideNames.map((name, j) => {
      const subActive = (isActive && j === cS) ? ' active' : '';
      return `<button class="mineral-sub-item${subActive}" onclick="goToSlide(${i}, ${j}); closeSidebar()">
        <span class="sub-num">${j + 1}</span>${name}
      </button>`;
    }).join('');
    return `<div class="mineral-group${isOpen ? ' open' : ''}">
      <div class="mineral-row">
        <button class="mineral-item${isActive ? ' active' : ''}" onclick="goTo(${i})">
          <span class="mineral-symbol">${m.simbolo}</span>
          <span class="mineral-name">${m.nome}</span>
        </button>
        <button class="mineral-chevron-btn" onclick="toggleMineralExpand(${i}, event)" aria-label="Expandir temas de ${m.nome}" title="Mostrar 7 temas">
          <span class="mineral-chevron">▾</span>
        </button>
      </div>
      <div class="mineral-subs">${subItems}</div>
    </div>`;
  }).join('');
}

function render(){
  const i = globalIndex();
  document.getElementById('sc').innerHTML = H[i];
  document.getElementById('cn').textContent = `${i + 1} / ${totalSlides()}`;

  // O HTML dos slides é gerado uma única vez no buildSlides(), com o stepper
  // "fotografado" em cS=0. Aqui sincronizamos a classe .active com cS atual.
  document.querySelectorAll('#sc .step-item').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === cS);
  });

  renderSidebarMenu();
  injectBg();
  attachImageFallbacks();
  const v = document.getElementById('sc');
  if(v) v.scrollTop = 0;
}

function attachImageFallbacks(){
  document.querySelectorAll('#sc img[data-fallback]').forEach(img => {
    if(img.dataset.fbBound) return;
    img.dataset.fbBound = '1';
    const apply = () => {
      const html = decodeURIComponent(img.dataset.fallback);
      const mode = img.dataset.fallbackMode;
      if(mode === 'parent' && img.parentNode){
        img.parentNode.innerHTML = html;
      } else {
        img.outerHTML = html;
      }
    };
    img.addEventListener('error', apply);
    if(img.complete && img.naturalWidth === 0) apply();
  });
}
function next(){ if(globalIndex() < totalSlides() - 1){ cS++; if(cS >= SN){ cM++; cS = 0 } render() } }
function prev(){ if(globalIndex() > 0){ cS--; if(cS < 0){ cM--; cS = SN - 1 } render() } }

function goToSlide(mineralIdx, slideIdx){
  cM = mineralIdx;
  cS = Math.max(0, Math.min(slideIdx, SN - 1));
  render();
}
function goTo(i){ goToSlide(i, 0); closeSidebar() }

function openSidebar(){
  document.getElementById('sb').classList.add('open');
  document.getElementById('so').classList.add('active');
  document.getElementById('hb').classList.add('active');
}
function closeSidebar(){
  document.getElementById('sb').classList.remove('open');
  document.getElementById('so').classList.remove('active');
  document.getElementById('hb').classList.remove('active');
}
function toggleSidebar(){
  document.getElementById('sb').classList.contains('open') ? closeSidebar() : openSidebar();
}

function printPDF(){
  const pc = document.getElementById('pc');
  pc.innerHTML = H.join('');
  if(!bgPrintCache) bgPrintCache = CONTOUR_BG.generate(1400, 990);
  pc.querySelectorAll('.slide:not(.slide-capa)').forEach(sl => {
    if(!sl.querySelector('.slide-bg')){
      const bg = document.createElement('div');
      bg.className = 'slide-bg';
      bg.style.backgroundImage = `url(${bgPrintCache})`;
      bg.style.backgroundSize = 'cover';
      bg.style.backgroundPosition = 'center';
      sl.prepend(bg);
    }
  });
  pc.querySelectorAll('img[data-fallback]').forEach(img => {
    const apply = () => {
      const html = decodeURIComponent(img.dataset.fallback);
      const mode = img.dataset.fallbackMode;
      if(mode === 'parent' && img.parentNode){
        img.parentNode.innerHTML = html;
      } else {
        img.outerHTML = html;
      }
    };
    img.addEventListener('error', apply);
    if(img.complete && img.naturalWidth === 0) apply();
  });
  setTimeout(() => window.print(), 600);
}

/* ════════════════════════════════════════════════════════════════════
   🎯 INTERAÇÃO
   ════════════════════════════════════════════════════════════════════ */
window.onload = async () => {
  const ok = await init();
  if(!ok) return;

  buildSlides();
  renderSidebarMenu();
  render();

  document.getElementById('hb').addEventListener('click', e => { e.stopPropagation(); toggleSidebar() });
  document.getElementById('so').addEventListener('click', closeSidebar);

  const sc = document.getElementById('sc');

  // ─── DESKTOP: click pra avançar (>900px) ───
  let pressStart = null;
  sc.addEventListener('mousedown', e => {
    // Não inicia "press" se foi no stepper ou em controles internos
    if(e.target.closest('.slide-stepper, .step-item')) { pressStart = null; return; }
    pressStart = { x: e.clientX, y: e.clientY, t: Date.now(), scrollTop: sc.scrollTop };
  });
  sc.addEventListener('mouseup', e => {
    if(!pressStart) return;
    // Se o mouseup foi sobre o stepper, ignora também
    if(e.target.closest('.slide-stepper, .step-item')) { pressStart = null; return; }
    const dx = Math.abs(e.clientX - pressStart.x);
    const dy = Math.abs(e.clientY - pressStart.y);
    const dt = Date.now() - pressStart.t;
    const dScroll = Math.abs(sc.scrollTop - pressStart.scrollTop);
    pressStart = null;
    if(dx < 8 && dy < 8 && dScroll < 5 && dt < 400 && window.innerWidth > 900) next();
  });

  // ─── MOBILE: só swipe horizontal troca slide ───
  let tStart = null;
  let isHSwipe = false;

  sc.addEventListener('touchstart', e => {
    if(e.touches.length > 1){ tStart = null; return; }
    // Não captura swipe se o toque começou no stepper
    if(e.target.closest('.slide-stepper, .step-item')){ tStart = null; return; }
    const t = e.touches[0];
    tStart = { x: t.screenX, y: t.screenY, scrollTop: sc.scrollTop };
    isHSwipe = false;
  }, { passive: true });

  sc.addEventListener('touchmove', e => {
    if(!tStart || e.touches.length > 1) return;
    const t = e.touches[0];
    const dx = t.screenX - tStart.x;
    const dy = t.screenY - tStart.y;
    if(!isHSwipe && Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.8){
      isHSwipe = true;
    }
  }, { passive: true });

  sc.addEventListener('touchend', e => {
    if(!tStart) return;
    const t = e.changedTouches[0];
    const dx = t.screenX - tStart.x;
    const ady = Math.abs(t.screenY - tStart.y);
    const adx = Math.abs(dx);
    const dScroll = Math.abs(sc.scrollTop - tStart.scrollTop);
    const wasHSwipe = isHSwipe;
    tStart = null;

    if(wasHSwipe && adx > 60 && adx > ady * 2 && dScroll < 10){
      dx < 0 ? next() : prev();
    }
  }, { passive: true });

  // ─── Resize ───
  let rt, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const dw = Math.abs(window.innerWidth - lastW);
      if(dw > 200){
        bgCache = null;
        lastW = window.innerWidth;
        injectBg();
      }
    }, 400);
  });
};

document.addEventListener('keydown', e => {
  if(e.key === 'ArrowRight' || e.key === ' '){ e.preventDefault(); next() }
  if(e.key === 'ArrowLeft') prev();
  if(e.key === 'Escape') closeSidebar();
});
