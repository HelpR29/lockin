// P&L Chart Integration
// Tracks profit/loss over time

let pnlChart = null;

// Initialize chart on page load
document.addEventListener('DOMContentLoaded', async () => {
    await initializePnLChart();
});

async function initializeJournalChart() {
    try {
        const container = document.getElementById('chartContainerJournal');
        if (!container) return;
        
        const config = {
            width: container.offsetWidth,
            height: container.offsetHeight,
            theme: {
                candle: {
                    UpBodyColour: "#26a69a",
                    UpWickColour: "#26a69a", 
                    DnBodyColour: "#ef5350",
                    DnWickColour: "#ef5350"
                },
                volume: {
                    UpColour: "#26a69a80",
                    DnColour: "#ef535080"
                }
            }
        };
        
        // Initialize chart (will show empty until trade is selected)
        journalChart = new TradeXChart(container, config);
        
    } catch (error) {
        console.error('Error initializing journal chart:', error);
    }
}

// Load chart for specific trade
async function loadTradeChart(trade) {
    try {
        currentTradeForChart = trade;
        
        // Determine asset type from symbol
        const isStock = !trade.symbol.includes('USDT') && !trade.symbol.includes('BTC') && !trade.symbol.includes('/');
        
        // Fetch chart data
        let chartData;
        if (isStock) {
            chartData = await fetchStockDataForTrade(trade.symbol);
        } else {
            chartData = await fetchCryptoDataForTrade(trade.symbol);
        }
        
        if (!chartData || chartData.length === 0) {
            throw new Error('No chart data available');
        }
        
        // Update chart with data
        if (journalChart) {
            journalChart.setData(chartData);
            
            // Add trade level markers
            addTradeLevelMarkers(trade);
        }
        
        // Update chart info
        updateChartInfo(trade);
        
    } catch (error) {
        console.error('Error loading trade chart:', error);
        alert('Could not load chart for this symbol. Try a different timeframe or symbol.');
    }
}

function addTradeLevelMarkers(trade) {
    if (!journalChart) return;
    
    // Add horizontal lines for entry, exit, stop, target
    const markers = [];
    
    // Entry level (green)
    if (trade.entry_price) {
        markers.push({
            type: 'horizontal',
            price: trade.entry_price,
            color: '#4CAF50',
            label: `Entry: ${trade.entry_price}`,
            width: 2
        });
    }
    
    // Exit level (blue)
    if (trade.exit_price) {
        markers.push({
            type: 'horizontal',
            price: trade.exit_price,
            color: '#2196F3',
            label: `Exit: ${trade.exit_price}`,
            width: 2
        });
    }
    
    // Stop loss (red)
    if (trade.stop_loss) {
        markers.push({
            type: 'horizontal',
            price: trade.stop_loss,
            color: '#F44336',
            label: `Stop: ${trade.stop_loss}`,
            width: 2,
            style: 'dashed'
        });
    }
    
    // Target price (yellow)
    if (trade.target_price) {
        markers.push({
            type: 'horizontal',
            price: trade.target_price,
            color: '#FFC107',
            label: `Target: ${trade.target_price}`,
            width: 2,
            style: 'dashed'
        });
    }
    
    // Apply markers to chart
    journalChart.addMarkers(markers);
}

function updateChartInfo(trade) {
    const chartInfo = document.getElementById('chartInfo');
    const chartSymbol = document.getElementById('chartSymbol');
    const chartDirection = document.getElementById('chartDirection');
    
    if (chartInfo && chartSymbol && chartDirection) {
        chartSymbol.textContent = trade.symbol;
        chartDirection.textContent = trade.direction.toUpperCase();
        chartDirection.style.color = trade.direction === 'long' ? '#4CAF50' : '#ef5350';
        chartInfo.style.display = 'block';
    }
}

async function fetchCryptoDataForTrade(symbol) {
    try {
        const response = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=200`
        );
        
        if (!response.ok) throw new Error('Failed to fetch crypto data');
        
        const data = await response.json();
        
        return data.map(candle => ({
            time: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));
        
    } catch (error) {
        console.error('Error fetching crypto data:', error);
        throw error;
    }
}

async function fetchStockDataForTrade(symbol) {
    try {
        const apiKey = 'X5R323WGWX5XBOM5';
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}&outputsize=compact`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch stock data');
        
        const data = await response.json();
        
        if (data['Error Message']) throw new Error('Invalid stock symbol');
        if (data['Note']) throw new Error('API limit reached');
        
        const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
        if (!timeSeriesKey) throw new Error('No data available');
        
        const timeSeries = data[timeSeriesKey];
        
        const chartData = Object.entries(timeSeries).map(([timestamp, values]) => ({
            time: new Date(timestamp).getTime(),
            open: parseFloat(values['1. open']),
            high: parseFloat(values['2. high']),
            low: parseFloat(values['3. low']),
            close: parseFloat(values['4. close']),
            volume: parseFloat(values['5. volume'] || 0)
        }));
        
        return chartData.sort((a, b) => a.time - b.time);
        
    } catch (error) {
        console.error('Error fetching stock data:', error);
        throw error;
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    if (journalChart) {
        const container = document.getElementById('chartContainerJournal');
        if (container) {
            journalChart.resize(container.offsetWidth, container.offsetHeight);
        }
    }
});

// Export to global scope
window.loadTradeChart = loadTradeChart;
