// Symbol Autocomplete for Trade Journal

// Popular symbols database
const popularSymbols = [
    // Crypto (Binance pairs)
    { symbol: 'BTCUSDT', name: 'Bitcoin', type: 'Crypto' },
    { symbol: 'ETHUSDT', name: 'Ethereum', type: 'Crypto' },
    { symbol: 'BNBUSDT', name: 'Binance Coin', type: 'Crypto' },
    { symbol: 'SOLUSDT', name: 'Solana', type: 'Crypto' },
    { symbol: 'XRPUSDT', name: 'Ripple', type: 'Crypto' },
    { symbol: 'ADAUSDT', name: 'Cardano', type: 'Crypto' },
    { symbol: 'DOGEUSDT', name: 'Dogecoin', type: 'Crypto' },
    { symbol: 'MATICUSDT', name: 'Polygon', type: 'Crypto' },
    { symbol: 'DOTUSDT', name: 'Polkadot', type: 'Crypto' },
    { symbol: 'AVAXUSDT', name: 'Avalanche', type: 'Crypto' },
    { symbol: 'SHIBUSDT', name: 'Shiba Inu', type: 'Crypto' },
    { symbol: 'LINKUSDT', name: 'Chainlink', type: 'Crypto' },
    { symbol: 'ATOMUSDT', name: 'Cosmos', type: 'Crypto' },
    { symbol: 'LTCUSDT', name: 'Litecoin', type: 'Crypto' },
    { symbol: 'UNIUSDT', name: 'Uniswap', type: 'Crypto' },
    
    // Stocks (US Markets)
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'Stock' },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Stock' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'Stock' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Stock' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Stock' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'Stock' },
    { symbol: 'META', name: 'Meta Platforms', type: 'Stock' },
    { symbol: 'AMD', name: 'AMD Inc.', type: 'Stock' },
    { symbol: 'NFLX', name: 'Netflix Inc.', type: 'Stock' },
    { symbol: 'DIS', name: 'Walt Disney Co.', type: 'Stock' },
    { symbol: 'BABA', name: 'Alibaba Group', type: 'Stock' },
    { symbol: 'V', name: 'Visa Inc.', type: 'Stock' },
    { symbol: 'JPM', name: 'JPMorgan Chase', type: 'Stock' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'Stock' },
    { symbol: 'WMT', name: 'Walmart Inc.', type: 'Stock' },
    { symbol: 'PG', name: 'Procter & Gamble', type: 'Stock' },
    { symbol: 'MA', name: 'Mastercard Inc.', type: 'Stock' },
    { symbol: 'BAC', name: 'Bank of America', type: 'Stock' },
    { symbol: 'KO', name: 'Coca-Cola Co.', type: 'Stock' },
    { symbol: 'PEP', name: 'PepsiCo Inc.', type: 'Stock' },
    { symbol: 'INTC', name: 'Intel Corp.', type: 'Stock' },
    { symbol: 'PYPL', name: 'PayPal Holdings', type: 'Stock' },
    { symbol: 'ADBE', name: 'Adobe Inc.', type: 'Stock' },
    { symbol: 'CSCO', name: 'Cisco Systems', type: 'Stock' },
    { symbol: 'NKE', name: 'Nike Inc.', type: 'Stock' },
    { symbol: 'CRM', name: 'Salesforce Inc.', type: 'Stock' },
    { symbol: 'ORCL', name: 'Oracle Corp.', type: 'Stock' },
    { symbol: 'IBM', name: 'IBM Corp.', type: 'Stock' },
    { symbol: 'QCOM', name: 'Qualcomm Inc.', type: 'Stock' },
    { symbol: 'TXN', name: 'Texas Instruments', type: 'Stock' }
];

let symbolInput = null;
let suggestionsContainer = null;

// Initialize autocomplete
document.addEventListener('DOMContentLoaded', () => {
    symbolInput = document.getElementById('symbol');
    suggestionsContainer = document.getElementById('symbolSuggestions');
    
    if (symbolInput && suggestionsContainer) {
        // Add input event listener
        symbolInput.addEventListener('input', handleSymbolInput);
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!symbolInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                hideSuggestions();
            }
        });
        
        // Handle keyboard navigation
        symbolInput.addEventListener('keydown', handleKeyboardNavigation);
    }
});

function handleSymbolInput(e) {
    const query = e.target.value.trim().toUpperCase();
    
    if (query.length < 1) {
        hideSuggestions();
        return;
    }
    
    // Filter symbols
    const matches = popularSymbols.filter(item => 
        item.symbol.toUpperCase().includes(query) || 
        item.name.toUpperCase().includes(query)
    ).slice(0, 10); // Limit to 10 results
    
    if (matches.length > 0) {
        showSuggestions(matches);
    } else {
        hideSuggestions();
    }
}

function showSuggestions(matches) {
    if (!suggestionsContainer) return;
    
    suggestionsContainer.innerHTML = matches.map(item => `
        <div class="suggestion-item" onclick="selectSymbol('${item.symbol}')">
            <div>
                <span class="suggestion-symbol">${item.symbol}</span>
                <span class="suggestion-name">${item.name}</span>
            </div>
            <span class="suggestion-type">${item.type}</span>
        </div>
    `).join('');
    
    suggestionsContainer.style.display = 'block';
}

function hideSuggestions() {
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

function selectSymbol(symbol) {
    if (symbolInput) {
        symbolInput.value = symbol;
        hideSuggestions();
        
        // Focus on next field (entry price)
        const entryPriceInput = document.getElementById('entryPrice');
        if (entryPriceInput) {
            entryPriceInput.focus();
        }
    }
}

function handleKeyboardNavigation(e) {
    if (!suggestionsContainer || suggestionsContainer.style.display === 'none') return;
    
    const items = suggestionsContainer.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;
    
    const currentActive = suggestionsContainer.querySelector('.suggestion-item.active');
    let index = -1;
    
    if (currentActive) {
        index = Array.from(items).indexOf(currentActive);
    }
    
    // Arrow Down
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        index = (index + 1) % items.length;
    }
    // Arrow Up
    else if (e.key === 'ArrowUp') {
        e.preventDefault();
        index = index <= 0 ? items.length - 1 : index - 1;
    }
    // Enter
    else if (e.key === 'Enter' && currentActive) {
        e.preventDefault();
        const symbol = currentActive.querySelector('.suggestion-symbol').textContent;
        selectSymbol(symbol);
        return;
    }
    // Escape
    else if (e.key === 'Escape') {
        hideSuggestions();
        return;
    }
    else {
        return;
    }
    
    // Update active state
    items.forEach(item => item.classList.remove('active'));
    if (index >= 0) {
        items[index].classList.add('active');
        items[index].scrollIntoView({ block: 'nearest' });
    }
}

// Export to global scope
window.selectSymbol = selectSymbol;
