/* ═══════════════════════════════════════════════════════════════════
   CORREÇÃO DA EXPORTAÇÃO PDF — SNGM/MME
   Cole este bloco inteiro no FINAL do seu app.js.
   Não apague nada: ele substitui a printPDF antiga automaticamente.
   (Use junto com o styles.css novo — as regras #sc/#pc/cv-* estão lá.)

   O que muda:
   1. O auto-fit deixa de usar `zoom` — o Chromium aplica zoom de forma
      inconsistente ao imprimir (layout numa largura, pintura noutra),
      o que estourava o conteúdo na horizontal ("Visão Geral" e
      "Cadeia de Valor"). Agora usa transform:scale() com compensação
      de largura/altura, que imprime de forma confiável.
   2. A medição espera fontes e imagens carregarem (antes era um
      setTimeout cego de 700 ms) e considera largura E altura.
   3. A grade da Cadeia de Valor recebe as classes cv-grid/cv-scroll
      na hora da impressão; o styles.css novo faz a matriz caber na
      largura da página (colunas 2030/2050 não são mais decepadas).
   4. O SVG do Mermaid (fluxograma) é dimensionado por código para
      ocupar o máximo possível da página, em largura E altura.

   OPCIONAL — fluxograma ainda maior: no seu mermaid.initialize(...),
   dentro de flowchart:{ ... }, acrescente:
       nodeSpacing: 30, rankSpacing: 34, padding: 8
   Diagrama mais compacto = nós maiores depois do ajuste de escala.
   ═══════════════════════════════════════════════════════════════════ */

/* Espera todas as <img> do container carregarem (ou falharem). */
function pdfWaitForImages(root){
  const imgs = Array.prototype.slice.call(root.querySelectorAll('img'));
  return Promise.all(imgs.map(function(img){
    if(img.complete) return Promise.resolve();
    return new Promise(function(res){
      img.addEventListener('load',  res, {once:true});
      img.addEventListener('error', res, {once:true});
    });
  }));
}

/* Dimensiona cada SVG do Mermaid para ocupar o máximo do contêiner
   (largura E altura), usando o viewBox como referência. */
function fitMermaidSvgs(root){
  root.querySelectorAll('.mermaid-flux').forEach(function(holder){
    const svg = holder.querySelector('svg');
    if(!svg) return;
    const vb = svg.viewBox && svg.viewBox.baseVal;
    if(!vb || !vb.width || !vb.height) return;
    const w = holder.clientWidth, h = holder.clientHeight;
    if(!w || !h) return;
    const s = Math.min(w / vb.width, h / vb.height);
    svg.style.maxWidth  = 'none';
    svg.style.maxHeight = 'none';
    svg.style.width  = (vb.width  * s) + 'px';
    svg.style.height = (vb.height * s) + 'px';
  });
}

/* Auto-fit de um slide via transform:scale (confiável na impressão).
   A margem negativa devolve ao rodapé o espaço que o height/s ocupa
   no layout — visualmente o conteúdo escala para caber exatamente. */
function autoFitSlide(sl){
  const content = sl.querySelector('.slide-content');
  if(!content) return; /* capa não tem .slide-content */

  ['transform','transform-origin','width','height','margin-bottom','flex']
    .forEach(function(p){ content.style.removeProperty(p); });
  content.style.zoom = '';

  const availW = content.clientWidth, availH = content.clientHeight;
  if(availH < 80 || availW < 300) return; /* medição inválida — não escala */

  let s = 1;
  for(let i = 0; i < 4; i++){
    const needW = content.scrollWidth, needH = content.scrollHeight;
    if(needW <= content.clientWidth + 1 && needH <= content.clientHeight + 1) break;
    s = Math.max(
      s * Math.min(content.clientWidth / needW, content.clientHeight / needH) * 0.99,
      0.5
    );
    content.style.setProperty('flex', 'none', 'important');
    content.style.setProperty('transform-origin', '0 0', 'important');
    content.style.setProperty('transform', 'scale(' + s + ')', 'important');
    content.style.setProperty('width',  (availW / s) + 'px', 'important');
    content.style.setProperty('height', (availH / s) + 'px', 'important');
    content.style.setProperty('margin-bottom', (availH - availH / s) + 'px', 'important');
    if(s <= 0.5) break;
  }
}

/* ─────────────────────────────────────────────────────────────────
   NOVA EXPORTAÇÃO DE PDF
   Ordem: montar → fundo → print-fit → fontes/imagens → mermaid →
   ajustar diagramas → auto-fit dos slides → imprimir → limpar.
   ───────────────────────────────────────────────────────────────── */
async function printPDFv2(){
  const pc = document.getElementById('pc');
  if(!pc || typeof H === 'undefined' || !H || !H.join){
    console.error('[PDF] container #pc ou array de slides H não encontrado.');
    window.print();
    return;
  }

  pc.innerHTML = H.join('');

  /* Fundo de contornos nos slides internos (igual ao original). */
  try{
    if(typeof CONTOUR_BG !== 'undefined' && CONTOUR_BG && CONTOUR_BG.generate){
      let _bg = null;
      try{ if(typeof bgPrintCache !== 'undefined' && bgPrintCache) _bg = bgPrintCache; }catch(e){}
      if(!_bg){
        _bg = CONTOUR_BG.generate(2245, 1588);
        try{ bgPrintCache = _bg; }catch(e){}
      }
      pc.querySelectorAll('.slide:not(.slide-capa)').forEach(function(sl){
        let bg = sl.querySelector('.slide-bg');
        if(!bg){
          bg = document.createElement('div');
          bg.className = 'slide-bg';
          sl.prepend(bg);
        }
        bg.style.backgroundImage = 'url(' + _bg + ')';
        bg.style.backgroundSize  = 'cover';
      });
    }
  }catch(e){ console.warn('[PDF] fundo de contornos:', e); }

  /* Imagens que falharem não podem quebrar o layout. */
  pc.querySelectorAll('img').forEach(function(img){
    const kill = function(){ img.style.display = 'none'; };
    if(img.complete && img.naturalWidth === 0) kill();
    else img.addEventListener('error', kill, {once:true});
  });

  /* 1) Posiciona no tamanho do papel ANTES de renderizar e medir. */
  pc.classList.add('print-fit');

  /* 2) Marca a grade da Cadeia de Valor para as regras cv-* do CSS
        (min-width zerado + células podem quebrar linha na impressão). */
  pc.querySelectorAll('div[style*="min-width:860"], div[style*="min-width: 860"]')
    .forEach(function(g){
      g.classList.add('cv-grid');
      if(g.parentElement) g.parentElement.classList.add('cv-scroll');
    });

  /* 3) Espera fontes e imagens de verdade (nada de setTimeout cego). */
  try{ await document.fonts.ready; }catch(e){}
  await pdfWaitForImages(pc);

  /* 4) Renderiza o Mermaid e maximiza os diagramas na página. */
  try{
    if(typeof renderMermaidIn === 'function') await renderMermaidIn(pc);
  }catch(e){ console.warn('[PDF] mermaid:', e); }
  await new Promise(function(r){
    requestAnimationFrame(function(){ requestAnimationFrame(r); });
  });
  fitMermaidSvgs(pc);

  /* 5) Auto-fit de cada slide — transform, nunca zoom. */
  pc.querySelectorAll('.slide').forEach(autoFitSlide);
  await new Promise(function(r){ requestAnimationFrame(r); });

  window.print();

  /* Limpeza: volta tudo ao estado normal. */
  pc.classList.remove('print-fit');
  pc.querySelectorAll('.slide-content').forEach(function(c){
    ['transform','transform-origin','width','height','margin-bottom','flex']
      .forEach(function(p){ c.style.removeProperty(p); });
    c.style.zoom = '';
  });
}

/* Redireciona a função antiga e os botões para a versão nova.
   Funciona sem apagar a printPDF original. */
(function(){
  try{ printPDF = printPDFv2; }catch(e){}        /* function/var/let → rebinda */
  try{ window.printPDF = printPDFv2; }catch(e){}
  const rebind = function(){
    document.querySelectorAll('[onclick*="printPDF"]').forEach(function(el){
      el.onclick = function(ev){
        if(ev && ev.preventDefault) ev.preventDefault();
        printPDFv2();
        return false;
      };
    });
  };
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', rebind);
  } else {
    rebind();
  }
})();
