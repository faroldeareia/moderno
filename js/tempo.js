document.addEventListener('DOMContentLoaded', function() {
    
    // 1. MUDANÇA: Seleciona os parágrafos dentro de '.story-body' (o novo nome da classe)
    var contentElements = document.querySelectorAll('.story-body p');
    var text = '';

    // Concatena o texto
    contentElements.forEach(function(element) {
        text += element.textContent + ' '; 
    });

    // Conta as palavras
    var wordCount = text.trim().split(/\s+/).filter(function(word) { return word.length > 0; }).length;

    // Calcula o tempo (200 palavras por minuto)
    var wordsPerMinute = 200;
    var readingTime = Math.ceil(wordCount / wordsPerMinute);

    // Texto formatado (com a bolinha separadora para combinar com o estilo)
    var readingTimeText = ` • ${readingTime} min de leitura`;

    // 2. MUDANÇA: Encontra a div de metadados nova '.story-meta'
    var metaElement = document.querySelector('.story-meta');

    // Verifica se encontrou e adiciona o texto
    if (metaElement && wordCount > 0) {
        // Simplesmente adiciona o texto ao final do conteúdo existente
        metaElement.textContent += readingTimeText;
    } 
    else if (!metaElement) {
        console.error('Elemento .story-meta não encontrado.');
    }
});