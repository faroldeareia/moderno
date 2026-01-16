document.addEventListener('DOMContentLoaded', () => {
    
    // ====================================================
    // 1. LÓGICA DAS ABAS
    // ====================================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active-tab'));
                tabContents.forEach(c => c.classList.remove('active-content'));

                btn.classList.add('active-tab');
                const targetId = btn.getAttribute('data-target');
                document.getElementById(targetId).classList.add('active-content');

                // Renderiza gráficos se a aba de stats for aberta
                if (targetId === 'data-stats' && window.renderStatistics) {
                    window.renderStatistics();
                }
            });
        });
    }

    // ====================================================
    // 2. ESTANTE (LIBRARY) & CONFIGURAÇÃO GERAL
    // ====================================================
    if (!document.getElementById('data-library')) return;

    let allBooks = [];
    const monthMap = { 
        "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6, 
        "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12 
    };

    const els = {
        search: document.getElementById('search-input'),
        genre: document.getElementById('genre-filter'),
        status: document.getElementById('status-filter'),
        sort: document.getElementById('sort-by'),
        filterPanel: document.getElementById('filter-panel'),
        filterBtn: document.getElementById('toggle-filter-btn'),
        reading: document.getElementById('reading-now-grid'),
        pending: document.getElementById('pending-grid'),
        history: document.getElementById('read-history-container'),
        // Adicionado elemento do filtro de estatísticas aqui
        statsYearFilter: document.getElementById('stats-year-filter')
    };

    initLibrary();

    async function initLibrary() {
        try {
            const response = await fetch('leituras.json');
            if (!response.ok) throw new Error(`JSON não encontrado: ${response.statusText}`);
            const data = await response.json();
            allBooks = preprocessData(data);
        } catch (error) {
            console.error("Erro ao carregar o JSON:", error);
            allBooks = []; 
            const lib = document.getElementById('data-library');
            if (lib) lib.innerHTML = `<p style="text-align: center; color: var(--gold);">Error loading data.</p>`;
        }
        
        // 
        // Só executamos isso DEPOIS que o JSON carregou (dentro do await)
        if (allBooks.length > 0) {
            populateFilters();      // Filtros da Biblioteca
            populateStatsFilter();  // CORREÇÃO: Filtro das Estatísticas
            setupLibraryEvents();   // Eventos de clique/change
            renderLibrary();        // Renderizar livros
        }
    }

    function preprocessData(books) {
        return books.map(book => {
            let r = 0;
            if (book.rating && typeof book.rating === 'string' && book.rating.trim() !== "") {
                r = parseFloat(book.rating.replace(',', '.'));
            } else if (typeof book.rating === 'number') {
                r = book.rating;
            }
            let y = 0;
            if (book.year && String(book.year).trim() !== "") y = parseInt(book.year);
            const genero = (book.genero && book.genero.trim() !== "") ? book.genero.trim() : "Other";
            return { ...book, ratingNum: r, yearNum: y, genero: genero };
        });
    }

    function populateFilters() {
        const genres = new Set();
        allBooks.forEach(b => { if (b.genero && b.genero !== "Other") genres.add(b.genero); });
        [...genres].sort().forEach(g => {
            const opt = new Option(g, g);
            els.genre.add(opt);
        });
    }

    // NOVA FUNÇÃO: Popula o filtro de anos das estatísticas
    function populateStatsFilter() {
        if (!els.statsYearFilter) return;
        
        // Limpa opções antigas exceto a primeira ("All Years")
        while (els.statsYearFilter.options.length > 1) {
            els.statsYearFilter.remove(1);
        }

        const years = new Set();
        // Filtra apenas livros lidos com ano válido
        allBooks.filter(b => b.status === 'Lido' && b.yearNum > 0).forEach(b => years.add(b.yearNum));
        
        [...years].sort((a,b) => b - a).forEach(y => {
            const opt = new Option(y, y);
            els.statsYearFilter.add(opt);
        });
    }

    function setupLibraryEvents() {
        // Toggle do painel de filtros
        els.filterBtn.addEventListener('click', () => {
            els.filterPanel.classList.toggle('is-open');
            els.filterBtn.textContent = els.filterPanel.classList.contains('is-open') ? "Close Filters -" : "Filter Collection +";
        });

        // Eventos da Biblioteca
        [els.search, els.genre, els.status, els.sort].forEach(input => {
            if(input) input.addEventListener(input.id === 'search-input' ? 'input' : 'change', renderLibrary);
        });

        // CORREÇÃO: Evento do filtro de Estatísticas movido para cá
        if (els.statsYearFilter) {
            els.statsYearFilter.addEventListener('change', () => {
                window.renderStatistics();
            });
        }
    }

    function renderLibrary() {
        const filters = {
            search: els.search.value.toLowerCase(),
            genre: els.genre.value,
            status: els.status.value, 
            sort: els.sort.value
        };

        let filtered = allBooks.filter(b => {
            const matchSearch = (b.title && b.title.toLowerCase().includes(filters.search)) || 
                              (b.author && b.author.toLowerCase().includes(filters.search));
            const matchGenre = filters.genre === 'todos' || b.genero === filters.genre;
            const matchStatus = filters.status === 'all' || b.status === filters.status;
            return matchSearch && matchGenre && matchStatus;
        });

        // Ordenação
        if (filters.sort === 'rating_desc') {
            filtered.sort((a,b) => b.ratingNum - a.ratingNum);
        } else if (filters.sort === 'date_desc') {
            filtered.sort((a,b) => (b.yearNum !== a.yearNum) ? b.yearNum - a.yearNum : (monthMap[b.month]||0) - (monthMap[a.month]||0));
        } else if (filters.sort === 'date_asc') {
            filtered.sort((a,b) => (a.yearNum !== b.yearNum) ? a.yearNum - b.yearNum : (monthMap[a.month]||0) - (monthMap[b.month]||0));
        } else if (filters.sort === 'title_asc') {
            filtered.sort((a,b) => a.title.localeCompare(b.title));
        } else if (filters.sort === 'author_asc') {
            filtered.sort((a,b) => a.author.localeCompare(b.author));
        }

        els.reading.innerHTML = ''; els.pending.innerHTML = ''; els.history.innerHTML = '';

        const reading = filtered.filter(b => b.status === 'Em Andamento');
        const pending = filtered.filter(b => b.status === 'Pendente');
        const history = filtered.filter(b => b.status === 'Lido');

        reading.forEach(b => els.reading.innerHTML += createCard(b, 'lendo'));
        pending.forEach(b => els.pending.innerHTML += createCard(b, 'pendente'));
        
        if (filters.sort.startsWith('date_')) {
            renderHistoryGrouped(history, filters.sort);
        } else {
            const grid = document.createElement('div');
            grid.className = 'book-grid';
            history.forEach(b => grid.innerHTML += createCard(b, 'lido'));
            els.history.innerHTML = grid.outerHTML;
        }
        
        document.getElementById('reading-now-section').style.display = reading.length ? 'block' : 'none';
        document.getElementById('pending-section').style.display = pending.length ? 'block' : 'none';
        document.getElementById('read-history-section').style.display = history.length ? 'block' : 'none';
        document.getElementById('no-results').style.display = (reading.length || pending.length || history.length) ? 'none' : 'block';
    }

    function renderHistoryGrouped(history, sortCriteria) {
        els.history.innerHTML = ''; 
        const grouped = history.reduce((acc, book) => {
            const year = book.yearNum > 0 ? book.yearNum : 'Sem Data';
            const month = (year !== 'Sem Data' && book.month) ? book.month : 'Sem Mês';
            if (!acc[year]) acc[year] = {};
            if (!acc[year][month]) acc[year][month] = [];
            acc[year][month].push(book);
            return acc;
        }, {});

        const sortedYears = Object.keys(grouped).sort((a, b) => {
            if (a === 'Sem Data') return 1;
            if (b === 'Sem Data') return -1;
            return sortCriteria === 'date_asc' ? a - b : b - a;
        });

        for (const year of sortedYears) {
            let yearHtml = `<h2 class="book-section h2">${year}</h2>`; 
            
            const sortedMonths = Object.keys(grouped[year]).sort((a, b) => {
                const valA = monthMap[a] || 0;
                const valB = monthMap[b] || 0;
                return sortCriteria === 'date_asc' ? valA - valB : valB - valA;
            });
            
            for (const month of sortedMonths) {
                if (month !== 'Sem Mês') {
                      yearHtml += `<h3 style="font-family: var(--font-serif); font-style: italic; font-weight: 300; color: var(--text-muted); margin-top: 30px; margin-bottom: 20px;">${month}</h3>`;
                }
                let monthGrid = '<div class="book-grid">';
                grouped[year][month].forEach(book => {
                    monthGrid += createCard(book, 'lido');
                });
                monthGrid += '</div>';
                yearHtml += monthGrid;
            }
            els.history.innerHTML += yearHtml;
        }
    }

    function createCard(book, type) {
        const statusClass = `status-${type}`;
        const statusMap = { 'Lido': 'Read', 'Em Andamento': 'Reading', 'Pendente': 'Pending' };
        const statusText = statusMap[book.status] || book.status;

        let genreTag = (book.genero && book.genero !== 'Other') ? `<span class="tag">${book.genero}</span>` : '';

        return `
        <div class="book-card">
            <h5 class="book-title">${book.title}</h5>
            <p class="book-author">${book.author}</p>
            <div class="card-footer">
                <div class="tags">
                    <span class="tag ${statusClass}">${statusText}</span>
                    ${genreTag} 
                </div>
                ${book.ratingNum > 0 ? `<span class="book-rating">${book.ratingNum} ★</span>` : ''}
            </div>
        </div>`;
    }

    // ====================================================
    // 3. ESTATÍSTICAS
    // ====================================================
    window.renderStatistics = function() {
        if (allBooks.length === 0) return;
        
        const readBooks = allBooks.filter(b => b.status === 'Lido');
        if (!readBooks.length) {
            document.getElementById('data-stats').innerHTML = `<p style="text-align: center; font-family: var(--font-serif); font-style: italic;">No data yet.</p>`;
            return;
        }

        // Pega o valor selecionado diretamente do elemento
        const selectedYear = els.statsYearFilter ? els.statsYearFilter.value : 'all';
        
        let filteredBooks = readBooks;
        if (selectedYear !== 'all') {
            filteredBooks = readBooks.filter(b => b.yearNum === parseInt(selectedYear));
        }

        // Estatísticas Básicas
        document.getElementById('stat-total-read').textContent = filteredBooks.length;
        const totalRating = filteredBooks.reduce((a,b) => a + b.ratingNum, 0);
        const ratedCount = filteredBooks.filter(b=>b.ratingNum > 0).length;
        document.getElementById('stat-avg-rating').textContent = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : "0.0";
        
        const genresCount = {};
        filteredBooks.forEach(b => { if(b.genero && b.genero !== "Other") genresCount[b.genero] = (genresCount[b.genero] || 0) + 1; });
        const topGenre = Object.keys(genresCount).reduce((a, b) => genresCount[a] > genresCount[b] ? a : b, "-");
        document.getElementById('stat-fav-genre').textContent = topGenre;

        // Livro mais bem avaliado
        const topRated = filteredBooks.reduce((max, b) => b.ratingNum > max.ratingNum ? b : max, {ratingNum: 0});
        document.getElementById('stat-top-book').textContent = topRated.ratingNum > 0 ? `${topRated.title} (${topRated.ratingNum}★)` : "-";

        // CONFIGURAÇÕES CHART.JS
        Chart.defaults.color = '#6B7E7C';
        Chart.defaults.font.family = 'Inter';

        // 1. Gráfico de Gêneros (Pie/Doughnut)
        const ctxGenre = document.getElementById('chart-genres');
        if (ctxGenre) {
            if (window.genreChart) window.genreChart.destroy(); // Destroi anterior para não sobrepor
            
            // Se houver dados filtrados, mostra. Senão, fica vazio.
            if (Object.keys(genresCount).length > 0) {
                 window.genreChart = new Chart(ctxGenre, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(genresCount),
                        datasets: [{
                            data: Object.values(genresCount),
                            backgroundColor: ['#4E91A5', '#D4AF37', '#6B7E7C', '#EAEAEA', '#2c4a54', '#8B9A99', '#A5B8B5'],
                            borderColor: '#0C141C',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
            }
        }
        
        // 2. Gráfico por Ano (Barra) - Mostra todos os anos SEMPRE, independentemente do filtro
        // (A menos que você queira esconder isso quando filtrar por ano, mas geralmente mantém-se para contexto)
        const yearsCount = {};
        readBooks.forEach(b => { if(b.yearNum > 0) yearsCount[b.yearNum] = (yearsCount[b.yearNum] || 0) + 1; });
        
        const ctxYear = document.getElementById('chart-books-per-year');
        if (ctxYear) {
            if (window.yearChart) window.yearChart.destroy();
            const sortedYears = Object.keys(yearsCount).sort((a,b) => a - b);
            window.yearChart = new Chart(ctxYear, {
                type: 'bar',
                data: {
                    labels: sortedYears,
                    datasets: [{
                        label: 'Books',
                        data: sortedYears.map(y => yearsCount[y]),
                        backgroundColor: '#4E91A5'
                    }]
                },
                options: {
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // 3. Gráfico por Mês (Line) - Aparece APENAS se um ano estiver selecionado
        const ctxMonth = document.getElementById('chart-books-per-month');
        if (ctxMonth) {
            if (window.monthChart) window.monthChart.destroy();
            
            if (selectedYear !== 'all') {
                ctxMonth.style.display = 'block';
                
                // Calcula meses apenas para o ano selecionado
                const monthsCount = {};
                const yearBooks = readBooks.filter(b => b.yearNum === parseInt(selectedYear));
                yearBooks.forEach(b => {
                    if (b.month && monthMap[b.month]) {
                        const monthNum = monthMap[b.month];
                        monthsCount[monthNum] = (monthsCount[monthNum] || 0) + 1;
                    }
                });

                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthData = Array(12).fill(0);
                Object.keys(monthsCount).forEach(m => {
                    monthData[parseInt(m) - 1] = monthsCount[m];
                });
                
                window.monthChart = new Chart(ctxMonth, {
                    type: 'line',
                    data: {
                        labels: monthNames,
                        datasets: [{
                            label: `Books in ${selectedYear}`,
                            data: monthData,
                            backgroundColor: 'rgba(78, 145, 165, 0.2)',
                            borderColor: '#4E91A5',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                        plugins: { legend: { display: false } }
                    }
                });
            } else {
                ctxMonth.style.display = 'none';
            }
        }
   };
});