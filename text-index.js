/* text-index.js - Versão Final (Language Aware + Sober Year) */

document.addEventListener('DOMContentLoaded', function() {
    
    // --- Configurações ---
    const jsonFilePath = 'js/sumariocontos.json'; 
    const contosContainer = document.getElementById('text-list-log-container');
    const filterContainer = document.getElementById('category-buttons-container');
    const sortFilter = document.getElementById('sort-by');
    const filterPanel = document.getElementById('text-filter-panel');
    const filterBtn = document.getElementById('toggle-text-filter-btn');
    const noResultsEl = document.getElementById('no-results-text');

    // --- Mapeamento de Ícones ---
    const categoryIcons = {
        "Children's": "🧸",
        "Fantasy": "🧙",
        "Sci-Fi with Magical Realism": "🌌",
        "Mystery": "🔎",
        "Sci-Fi": "🚀",
        "Poetry": "🖋",
        "Magical Realism": "✨",
        "Microfiction": "✏️",
        "all": "∞" 
    };

    let allContos = [];
    let currentCategory = 'all';

    // --- Funções Auxiliares de Data ---
    const monthOrder = {
        'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4, 'maio': 5, 'junho': 6,
        'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
    };

    function parseDate(dateString) {
        // Tenta parsear formato "12 de janeiro de 2026"
        if (!dateString) return new Date();
        const parts = dateString.replace(/º/g, '').toLowerCase().split(' de ');
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = monthOrder[parts[1]];
            const year = parseInt(parts[2]);
            if (!isNaN(day) && month !== undefined && !isNaN(year)) {
                return new Date(year, month - 1, day);
            }
        }
        return new Date(dateString); // Fallback para formato padrão ISO
    }

    // --- Inicialização ---
    fetch(jsonFilePath)
        .then(response => response.json())
        .then(data => {
            // Processa datas e adiciona propriedades auxiliares
            allContos = data.map(conto => ({
                ...conto,
                parsedDate: parseDate(conto.date),
                year: parseDate(conto.date).getFullYear() || 9999
            }));

            setupFilters(); // Cria os botões de categoria
            renderTextList(); // Renderiza a lista inicial
        })
        .catch(err => console.error("Erro carregando contos:", err));

    // --- Setup dos Botões de Filtro ---
    function setupFilters() {
        // Extrai categorias únicas do JSON
        const categories = new Set(allContos.map(c => c.category).filter(Boolean));
        // Ordena alfabeticamente
        const sortedCategories = ['all', ...[...categories].sort()];

        filterContainer.innerHTML = '';

        sortedCategories.forEach(cat => {
            const btn = document.createElement('button');
            const icon = categoryIcons[cat] || '📄'; // Ícone padrão
            const label = cat === 'all' ? 'Todos' : cat;
            
            btn.className = 'filter-pill';
            if (cat === 'all') btn.classList.add('active');
            btn.innerHTML = `${icon} ${label}`;
            
            btn.addEventListener('click', () => {
                // Remove active de todos
                document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
                // Adiciona no clicado
                btn.classList.add('active');
                
                currentCategory = cat;
                renderTextList();
            });

            filterContainer.appendChild(btn);
        });

        // Eventos do painel (abrir/fechar) e ordenação
        filterBtn.addEventListener('click', () => {
            filterPanel.classList.toggle('is-open');
            filterBtn.textContent = filterPanel.classList.contains('is-open') ? "Close Filters -" : "Filter Texts +";
        });

        sortFilter.addEventListener('change', renderTextList);
    }

    // --- Renderização Principal (Agrupada por Ano) ---
    function renderTextList() {
        contosContainer.innerHTML = '';
        const sortType = sortFilter.value;

        // 1. Filtrar por categoria
        let filtered = allContos.filter(c => currentCategory === 'all' || c.category === currentCategory);

        // 2. Ordenar globalmente pela data
        if (sortType === 'date_desc') {
            filtered.sort((a, b) => b.parsedDate - a.parsedDate);
        } else {
            filtered.sort((a, b) => a.parsedDate - b.parsedDate);
        }

        // Exibe mensagem se não houver resultados
        if (filtered.length === 0) {
            noResultsEl.style.display = 'block';
            return;
        } else {
            noResultsEl.style.display = 'none';
        }

        // 3. Agrupar por Ano
        const groups = new Map();
        
        filtered.forEach(conto => {
            const y = conto.year;
            if (!groups.has(y)) groups.set(y, []);
            groups.get(y).push(conto);
        });

        // 4. Gerar HTML por Grupo (Iterando o Map)
        groups.forEach((contosDoAno, ano) => {
            // Cria container do ano
            const yearBlock = document.createElement('div');
            yearBlock.className = 'year-block';
            
            // Título do Ano (Novo estilo sóbrio)
            yearBlock.innerHTML = `<div class="year-title">${ano}</div>`;

            // Adiciona os contos deste ano
            contosDoAno.forEach(conto => {
                yearBlock.innerHTML += createEntryHTML(conto);
            });

            contosContainer.appendChild(yearBlock);
        });
    }

    // --- Geração do HTML de cada Item (Com Detecção de Idioma) ---
    function createEntryHTML(conto) {
        // Limpeza dos links (remove '../' se existir)
        const linkPT = conto.filename ? conto.filename.replace('../', '') : '#';
        const linkEN = conto.filename_en ? conto.filename_en.replace('../', '') : '';
        const icon = categoryIcons[conto.category] || '';

        // 1. Criar Bloco HTML para Português
        const htmlPT = `
            <a href="${linkPT}" class="story-link link-pt">
                <span class="flag-icon">🇧🇷</span> 
                <span class="story-title">${conto.title}</span>
            </a>
        `;

        // 2. Criar Bloco HTML para Inglês (se existir)
        let htmlEN = '';
        if (conto.title_en && linkEN) {
            htmlEN = `
                <a href="${linkEN}" class="story-link link-en">
                    <span class="flag-icon">🇺🇸</span> 
                    <span class="story-title">${conto.title_en}</span>
                </a>
            `;
        }

        // 3. Lógica de Ordenação baseada no Navegador
        // Detecta idioma do usuário (ex: 'pt-BR' ou 'en-US')
        const userLang = navigator.language || navigator.userLanguage; 
        const isPortuguese = userLang.toLowerCase().includes('pt');

        let linksHTML = '';

        if (isPortuguese) {
            // Se for PT: Português em cima, Inglês embaixo
            linksHTML = htmlPT + htmlEN;
        } else {
            // Se for outro idioma: Inglês em cima (se existir), PT embaixo
            // Se não tiver EN, mostra só o PT
            linksHTML = (htmlEN ? htmlEN : '') + htmlPT;
        }
        
        // 4. Retorna o Card completo
        return `
        <article class="log-entry">
            <span class="log-date">${conto.date}</span>
            
            <div class="log-content">
                <div class="links-wrapper">
                    ${linksHTML}
                </div>
                
                <p class="text-category">${icon} ${conto.category}</p>
            </div>
        </article>`;
    }
});
