document.addEventListener('DOMContentLoaded', () => {
    const galleryCards = document.querySelectorAll('.gallery-card');
    const modal = document.getElementById('gallery-lightbox');
    
    // Se não houver galeria ou modal nesta página, não faz nada
    if (galleryCards.length === 0 || !modal) return;

    const modalImg = document.getElementById('lightbox-image');
    const modalCaption = document.getElementById('lightbox-caption');
    const closeBtn = modal.querySelector('.lightbox-close');
    const prevBtn = modal.querySelector('.lightbox-nav.prev');
    const nextBtn = modal.querySelector('.lightbox-nav.next');

    let galleryData = []; // Array para guardar os dados
    let currentIndex = 0; // Índice da imagem atual

    // 1. Coleta os dados de todas as imagens e guarda no array
    galleryCards.forEach((card, index) => {
        galleryData.push({
            src: card.dataset.src,       // Pega o link da imagem grande
            caption: card.dataset.caption  // Pega a legenda
        });

        // 2. Adiciona o listener de clique a cada card
        card.addEventListener('click', () => {
            openModal(index);
        });
    });

    /**
     * Abre o modal e mostra uma imagem específica
     */
    function openModal(index) {
        if (index < 0 || index >= galleryData.length) {
            console.error("Índice da galeria fora dos limites.");
            return;
        }
        
        currentIndex = index;
        const data = galleryData[currentIndex];
        
        modalImg.src = data.src;
        modalCaption.textContent = data.caption;
        
        modal.style.display = 'block';
        updateNavButtons();
    }

    /**
     * Fecha o modal
     */
    function closeModal() {
        modal.style.display = 'none';
        modalImg.src = ''; // Limpa o src para parar o carregamento (boa prática)
    }

    /**
     * Mostra a próxima imagem
     */
    function showNext() {
        if (currentIndex < galleryData.length - 1) {
            openModal(currentIndex + 1);
        }
    }

    /**
     * Mostra a imagem anterior
     */
    function showPrev() {
        if (currentIndex > 0) {
            openModal(currentIndex - 1);
        }
    }

    /**
     * Esconde os botões de navegação se estiver no início ou fim
     */
    function updateNavButtons() {
        // Botão "anterior"
        if (currentIndex === 0) {
            prevBtn.classList.add('disabled');
        } else {
            prevBtn.classList.remove('disabled');
        }
        
        // Botão "próximo"
        if (currentIndex === galleryData.length - 1) {
            nextBtn.classList.add('disabled');
        } else {
            nextBtn.classList.remove('disabled');
        }
    }

    // 3. Listeners dos controles do Modal
    closeBtn.addEventListener('click', closeModal);
    nextBtn.addEventListener('click', showNext);
    prevBtn.addEventListener('click', showPrev);

    // Clicar no fundo escuro para fechar
    modal.addEventListener('click', (e) => {
        // Se o clique foi no próprio fundo (e não na imagem ou botões)
        if (e.target === modal) {
            closeModal();
        }
    });

    // 4. Listeners do Teclado (Navegação)
    document.addEventListener('keydown', (e) => {
        if (modal.style.display !== 'block') return; // Só funciona se o modal estiver aberto

        if (e.key === 'Escape') {
            closeModal();
        }
        if (e.key === 'ArrowRight') {
            showNext();
        }
        if (e.key === 'ArrowLeft') {
            showPrev();
        }
    });
});