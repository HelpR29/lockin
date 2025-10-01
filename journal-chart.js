// P&L Chart Integration using AlphaVantage + Chart.js
// Tracks profit/loss over time and displays trade price charts

let journalChart = null;
let currentTradeForChart = null;

// Initialize chart on page load
document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('tradeChartCanvas');
    if (canvas) {
        await initializeJournalChart();
    }
});

async function initializeJournalChart() {
    try {
        const canvas = document.getElementById('tradeChartCanvas');
        if (!canvas) {
            console.warn('Trade chart canvas not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Initialize empty Chart.js chart
        journalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Price',
                    data: [],
                    borderColor: '#FF9500',
                    backgroundColor: 'rgba(255, 149, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#fff'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#FF9500',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#999'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#999'
                        }
                    }
                }
            }
        });
        
        console.log('✅ Journal chart initialized');
        
    } catch (error) {
        console.error('Error initializing journal chart:', error);
    }
}

// Load chart for specific trade using AlphaVantage data
async function loadTradeChart(trade) {
    try {
        if (!journalChart) {
            console.log('Chart not initialized, initializing now...');
            await initializeJournalChart();
        }
        
        currentTradeForChart = trade;
        
        console.log('Loading chart for trade:', trade.symbol);
        
        // Determine asset type from symbol
        const isStock = !trade.symbol.includes('USDT') && !trade.symbol.includes('BTC') && !trade.symbol.includes('/');
        
        // Fetch chart data from AlphaVantage (stocks) or Binance (crypto)
        let chartData;
        if (isStock) {
            chartData = await fetchStockDataForTrade(trade.symbol);
        } else {
            chartData = await fetchCryptoDataForTrade(trade.symbol);
        }
        
        if (!chartData || chartData.length === 0) {
            throw new Error('No chart data available');
        }
        
        // Update Chart.js with new data
        if (journalChart) {
            const labels = chartData.map(d => new Date(d.time).toLocaleDateString());
            const prices = chartData.map(d => d.close);
            
            journalChart.data.labels = labels;
            journalChart.data.datasets[0].data = prices;
            journalChart.data.datasets[0].label = `${trade.symbol} - ${trade.direction.toUpperCase()}`;
            
            // Add horizontal lines for entry, stop, target
            journalChart.options.plugins.annotation = {
                annotations: createTradeAnnotations(trade)
            };
            
            journalChart.update();
            console.log('✅ Chart updated with', chartData.length, 'data points');
        }
        
        // Update chart info
        updateChartInfo(trade);
        
    } catch (error) {
        console.error('Error loading trade chart:', error);
        alert('Could not load chart data. AlphaVantage API limit may be reached or symbol not found.');
    }
}

// Create annotation lines for Chart.js
function createTradeAnnotations(trade) {
    const annotations = {};
    
    // Entry level (green)
    if (trade.entry_price) {
        annotations.entryLine = {
            type: 'line',
            yMin: trade.entry_price,
            yMax: trade.entry_price,
            borderColor: '#4CAF50',
            borderWidth: 2,
            label: {
                display: true,
                content: `Entry: $${trade.entry_price}`,
                position: 'end',
                backgroundColor: '#4CAF50',
                color: '#fff'
            }
        };
    }
    
    // Exit level (blue)
    if (trade.exit_price) {
        annotations.exitLine = {
            type: 'line',
            yMin: trade.exit_price,
            yMax: trade.exit_price,
            borderColor: '#2196F3',
            borderWidth: 2,
            label: {
                display: true,
                content: `Exit: $${trade.exit_price}`,
                position: 'end',
                backgroundColor: '#2196F3',
                color: '#fff'
            }
        };
    }
    
    // Stop loss (red, dashed)
    if (trade.stop_loss) {
        annotations.stopLine = {
            type: 'line',
            yMin: trade.stop_loss,
            yMax: trade.stop_loss,
            borderColor: '#F44336',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                display: true,
                content: `Stop: $${trade.stop_loss}`,
                position: 'start',
                backgroundColor: '#F44336',
                color: '#fff'
            }
        };
    }
    
    // Target price (yellow, dashed)
    if (trade.target_price) {
        annotations.targetLine = {
            type: 'line',
            yMin: trade.target_price,
            yMax: trade.target_price,
            borderColor: '#FFC107',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                display: true,
                content: `Target: $${trade.target_price}`,
                position: 'start',
                backgroundColor: '#FFC107',
                color: '#000'
            }
        };
    }
    
    return annotations;
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
