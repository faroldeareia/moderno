/* =====================================================================
   Lighthouse of Sand — script.js (versão reescrita e robusta)!
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ==================================================================
    // 1. LÓGICA DAS ABAS  (totalmente isolada — roda sempre)
    // ==================================================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);

            // Se o alvo não existir, avisa no console e para (não quebra a página)
            if (!targetEl) {
                console.warn(`Aba "${targetId}" não encontrada no HTML.`);
                return;
            }

            // Limpa estado de todos
            tabBtns.forEach(b => b.classList.remove('active-tab'));
            tabContents.forEach(c => c.classList.remove('active-content'));

            // Ativa o clicado
            btn.classList.add('active-tab');
            targetEl.classList.add('active-content');

            // Renderiza estatísticas só quando a aba é aberta
            if (targetId === 'data-stats' && typeof window.renderStatistics === 'function') {
                window.renderStatistics();
            }
        });
    });

    // ==================================================================
    // 2. ESTANTE / BIBLIOTECA — só roda se a página tiver a estante
    // ==================================================================
    if (!document.getElementById('data-library')) return;

    let allBooks = [];

    const monthMap = {
        "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6,
        "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12
    };

    const els = {
        search:         document.getElementById('search-input'),
        genre:          document.getElementById('genre-filter'),
        status:         document.getElementById('status-filter'),
        sort:           document.getElementById('sort-by'),
        filterPanel:    document.getElementById('filter-panel'),
        filterBtn:      document.getElementById('toggle-filter-btn'),
        reading:        document.getElementById('reading-now-grid'),
        pending:        document.getElementById('pending-grid'),
        history:        document.getElementById('read-history-container'),
        statsYearFilter:document.getElementById('stats-year-filter')
    };

    // Eventos da biblioteca são ligados UMA vez, já no início,
    // independentemente do JSON ter carregado ou não.
    setupLibraryEvents();

    initLibrary();

    // ------------------------------------------------------------------
    async function initLibrary() {
        try {
            const response = await fetch('leituras.json');
            if (!response.ok) throw new Error(`HTTP ${response.status} — ${response.statusText}`);
            const data = await response.json();
            allBooks = preprocessData(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Erro ao carregar leituras.json:", error);
            allBooks = [];
            showLoadError();
            return;
        }

        if (allBooks.length === 0) {
            showLoadError("Nenhum livro encontrado no arquivo.");
            return;
        }

        populateFilters();
        populateStatsFilter();
        renderLibrary();
    }

    function showLoadError(msg) {
        const target = els.history || document.getElementById('data-library');
        if (target) {
            target.innerHTML =
                `<p style="text-align:center; color: var(--gold); font-family: var(--font-serif); font-style: italic;">
                    ${msg || "Não foi possível carregar os dados (leituras.json)."}
                 </p>`;
        }
    }

    // ------------------------------------------------------------------
    function preprocessData(books) {
        return books.map(book => {
            let r = 0;
            if (typeof book.rating === 'string' && book.rating.trim() !== "") {
                r = parseFloat(book.rating.replace(',', '.')) || 0;
            } else if (typeof book.rating === 'number') {
                r = book.rating;
            }

            let y = 0;
            if (book.year !== undefined && String(book.year).trim() !== "") {
                y = parseInt(book.year, 10) || 0;
            }

            const genero = (book.genero && book.genero.trim() !== "") ? book.genero.trim() : "Other";

            return {
                ...book,
                title:  book.title  || "Sem título",
                author: book.author || "Autor desconhecido",
                status: book.status || "",
                month:  book.month  || "",
                ratingNum: r,
                yearNum: y,
                genero: genero
            };
        });
    }

    // ------------------------------------------------------------------
    function populateFilters() {
        if (!els.genre) return;
        const genres = new Set();
        allBooks.forEach(b => { if (b.genero && b.genero !== "Other") genres.add(b.genero); });
        [...genres].sort().forEach(g => els.genre.add(new Option(g, g)));
    }

    function populateStatsFilter() {
        if (!els.statsYearFilter) return;

        while (els.statsYearFilter.options.length > 1) {
            els.statsYearFilter.remove(1);
        }

        const years = new Set();
        allBooks
            .filter(b => b.status === 'Lido' && b.yearNum > 0)
            .forEach(b => years.add(b.yearNum));

        [...years].sort((a, b) => b - a).forEach(y => els.statsYearFilter.add(new Option(y, y)));
    }

    // ------------------------------------------------------------------
    function setupLibraryEvents() {
        if (els.filterBtn && els.filterPanel) {
            els.filterBtn.addEventListener('click', () => {
                els.filterPanel.classList.toggle('is-open');
                els.filterBtn.textContent = els.filterPanel.classList.contains('is-open')
                    ? "Close Filters -"
                    : "Filter Collection +";
            });
        }

        [els.search, els.genre, els.status, els.sort].forEach(input => {
            if (!input) return;
            const evt = (input.id === 'search-input') ? 'input' : 'change';
            input.addEventListener(evt, renderLibrary);
        });

        if (els.statsYearFilter) {
            els.statsYearFilter.addEventListener('change', () => {
                if (typeof window.renderStatistics === 'function') window.renderStatistics();
            });
        }
    }

    // ------------------------------------------------------------------
    function renderLibrary() {
        if (!els.reading || !els.pending || !els.history) return;
        if (allBooks.length === 0) return;

        const filters = {
            search: els.search ? els.search.value.toLowerCase() : "",
            genre:  els.genre  ? els.genre.value  : "todos",
            status: els.status ? els.status.value : "all",
            sort:   els.sort   ? els.sort.value   : "date_desc"
        };

        let filtered = allBooks.filter(b => {
            const matchSearch =
                b.title.toLowerCase().includes(filters.search) ||
                b.author.toLowerCase().includes(filters.search);
            const matchGenre  = filters.genre === 'todos' || b.genero === filters.genre;
            const matchStatus = filters.status === 'all'  || b.status === filters.status;
            return matchSearch && matchGenre && matchStatus;
        });

        // Ordenação (com guardas para evitar erro em campos vazios)
        switch (filters.sort) {
            case 'rating_desc':
                filtered.sort((a, b) => b.ratingNum - a.ratingNum);
                break;
            case 'date_desc':
                filtered.sort((a, b) =>
                    (b.yearNum !== a.yearNum)
                        ? b.yearNum - a.yearNum
                        : (monthMap[b.month] || 0) - (monthMap[a.month] || 0));
                break;
            case 'date_asc':
                filtered.sort((a, b) =>
                    (a.yearNum !== b.yearNum)
                        ? a.yearNum - b.yearNum
                        : (monthMap[a.month] || 0) - (monthMap[b.month] || 0));
                break;
            case 'title_asc':
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'author_asc':
                filtered.sort((a, b) => a.author.localeCompare(b.author));
                break;
        }

        els.reading.innerHTML = '';
        els.pending.innerHTML = '';
        els.history.innerHTML = '';

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

        toggleSection('reading-now-section', reading.length);
        toggleSection('pending-section', pending.length);
        toggleSection('read-history-section', history.length);

        const noResults = document.getElementById('no-results');
        if (noResults) {
            const anything = reading.length || pending.length || history.length;
            noResults.style.display = anything ? 'none' : 'block';
        }
    }

    function toggleSection(id, count) {
        const sec = document.getElementById(id);
        if (sec) sec.style.display = count ? 'block' : 'none';
    }

    // ------------------------------------------------------------------
    function renderHistoryGrouped(history, sortCriteria) {
        if (!els.history) return;
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
                grouped[year][month].forEach(book => { monthGrid += createCard(book, 'lido'); });
                monthGrid += '</div>';
                yearHtml += monthGrid;
            }
            els.history.innerHTML += yearHtml;
        }
    }

    // ------------------------------------------------------------------
    function createCard(book, type) {
        const statusClass = `status-${type}`;
        const statusMap = { 'Lido': 'Read', 'Em Andamento': 'Reading', 'Pendente': 'Pending' };
        const statusText = statusMap[book.status] || book.status;

        const genreTag = (book.genero && book.genero !== 'Other')
            ? `<span class="tag">${book.genero}</span>` : '';

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

    // ==================================================================
    // 3. ESTATÍSTICAS
    // ==================================================================
    window.renderStatistics = function () {
        const statsTab = document.getElementById('data-stats');
        if (!statsTab) return;

        if (allBooks.length === 0) {
            setText('stat-total-read', '0');
            setText('stat-avg-rating', '0.0');
            setText('stat-fav-genre', '-');
            setText('stat-top-book', '-');
            return;
        }

        const readBooks = allBooks.filter(b => b.status === 'Lido');
        if (readBooks.length === 0) return;

        const selectedYear = els.statsYearFilter ? els.statsYearFilter.value : 'all';
        let filteredBooks = (selectedYear !== 'all')
            ? readBooks.filter(b => b.yearNum === parseInt(selectedYear, 10))
            : readBooks;

        // --- números ---
        setText('stat-total-read', filteredBooks.length);

        const ratedBooks = filteredBooks.filter(b => b.ratingNum > 0);
        const totalRating = ratedBooks.reduce((a, b) => a + b.ratingNum, 0);
        setText('stat-avg-rating', ratedBooks.length ? (totalRating / ratedBooks.length).toFixed(1) : "0.0");

        const genresCount = {};
        filteredBooks.forEach(b => {
            if (b.genero && b.genero !== "Other") genresCount[b.genero] = (genresCount[b.genero] || 0) + 1;
        });
        const topGenre = Object.keys(genresCount).reduce((a, b) => genresCount[a] > genresCount[b] ? a : b, "-");
        setText('stat-fav-genre', topGenre);

        const topRated = filteredBooks.reduce((max, b) => b.ratingNum > max.ratingNum ? b : max, { ratingNum: 0 });
        setText('stat-top-book', topRated.ratingNum > 0 ? `${topRated.title} (${topRated.ratingNum}★)` : "-");

        // --- gráficos (só se o Chart.js carregou) ---
        if (typeof Chart === 'undefined') {
            console.warn("Chart.js não carregou — gráficos desativados (verifique a conexão/CDN).");
            return;
        }

        Chart.defaults.color = '#6B7E7C';
        Chart.defaults.font.family = 'Inter';

        // 1) Gêneros (doughnut)
        const ctxGenre = document.getElementById('chart-genres');
        if (ctxGenre) {
            if (window.genreChart) window.genreChart.destroy();
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
                    options: { plugins: { legend: { position: 'bottom' } } }
                });
            }
        }

        // 2) Por ano (barra) — sempre mostra todos os anos
        const yearsCount = {};
        readBooks.forEach(b => { if (b.yearNum > 0) yearsCount[b.yearNum] = (yearsCount[b.yearNum] || 0) + 1; });

        const ctxYear = document.getElementById('chart-books-per-year');
        if (ctxYear) {
            if (window.yearChart) window.yearChart.destroy();
            const sortedYears = Object.keys(yearsCount).sort((a, b) => a - b);
            window.yearChart = new Chart(ctxYear, {
                type: 'bar',
                data: {
                    labels: sortedYears,
                    datasets: [{ label: 'Books', data: sortedYears.map(y => yearsCount[y]), backgroundColor: '#4E91A5' }]
                },
                options: {
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // 3) Por mês (linha) — só quando um ano específico está selecionado
        const ctxMonth = document.getElementById('chart-books-per-month');
        if (ctxMonth) {
            if (window.monthChart) window.monthChart.destroy();

            if (selectedYear !== 'all') {
                ctxMonth.style.display = 'block';

                const monthsCount = {};
                readBooks
                    .filter(b => b.yearNum === parseInt(selectedYear, 10))
                    .forEach(b => {
                        if (b.month && monthMap[b.month]) {
                            const m = monthMap[b.month];
                            monthsCount[m] = (monthsCount[m] || 0) + 1;
                        }
                    });

                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthData = Array(12).fill(0);
                Object.keys(monthsCount).forEach(m => { monthData[parseInt(m, 10) - 1] = monthsCount[m]; });

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

    // helper
    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
});
