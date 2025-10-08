// P&L Chart Integration using AlphaVantage + Chart.js
// Tracks profit/loss over time and displays trade price charts

let journalChart = null;
let currentTradeForChart = null;

// Register Chart.js plugins
if (typeof Chart !== 'undefined') {
    if (typeof ChartAnnotation !== 'undefined') {
        Chart.register(ChartAnnotation);
        console.log('✅ Chart.js annotation plugin registered');
    }

window.resetChartZoom = function() {
    if (journalChart && typeof journalChart.resetZoom === 'function') {
        journalChart.resetZoom();
    }
    const btn = document.getElementById('resetZoomBtn');
    if (btn) btn.style.display = 'none';
};
    if (typeof window.ChartZoom !== 'undefined') {
        Chart.register(window.ChartZoom);
        console.log('✅ Chart.js zoom plugin registered');
    }
}

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
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const price = context.formattedValue;
                                return ` Price: $${price}`;
                            }
                        }
                    },
                    zoom: {
                        limits: {
                            x: { min: 'original', max: 'original' }
                        },
                        zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            drag: { enabled: true, modifierKey: 'shift' },
                            mode: 'x'
                        },
                        pan: {
                            enabled: true,
                            mode: 'x'
                        },
                        onZoomComplete: () => {
                            const btn = document.getElementById('resetZoomBtn');
                            if (btn) btn.style.display = 'inline-block';
                        }
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
            
            // Add horizontal lines for entry, exit, stop, target
            const annotations = createTradeAnnotations(trade);
            console.log('📊 Adding annotations:', Object.keys(annotations));
            
            if (!journalChart.options.plugins) {
                journalChart.options.plugins = {};
            }
            
            journalChart.options.plugins.annotation = {
                annotations: annotations
            };
            
            journalChart.update();
            console.log('✅ Chart updated with', chartData.length, 'data points');
        }
        
        // Update chart info and show container
        updateChartInfo(trade);
        // Show the right panel and chart container
        try {
            const section = document.querySelector('.chart-section');
            if (section && section.style.display === 'none') section.style.display = 'block';
        } catch(_) { /* ignore */ }
        const chartContainer = document.getElementById('chartContainer');
        if (chartContainer) {
            chartContainer.style.display = 'block';
        }

        const resetButton = document.getElementById('resetZoomBtn');
        if (resetButton) {
            resetButton.style.display = 'none';
            resetButton.onclick = () => {
                if (journalChart && typeof journalChart.resetZoom === 'function') {
                    journalChart.resetZoom();
                }
                resetButton.style.display = 'none';
            };
        }

    } catch (error) {
        console.error('Error loading trade chart:', error);
        alert('Could not load chart data. AlphaVantage API limit may be reached or symbol not found.');
    }
}

function updateChartInfo(trade) {
    const chartInfo = document.getElementById('chartInfo');
    const chartSymbol = document.getElementById('chartSymbol');
    const chartDirection = document.getElementById('chartDirection');
    const header = document.getElementById('chartTitle');

    // Calculate Risk:Reward ratios
    let plannedRR = null;
    let actualRR = null;
    let rrDisplay = '';
    
    const entry = Number(trade.entry_price);
    const stop = trade.stop_loss != null ? Number(trade.stop_loss) : null;
    const target = trade.target_price != null ? Number(trade.target_price) : null;
    const exit = trade.exit_price != null ? Number(trade.exit_price) : null;
    const isLong = (trade.direction || '').toLowerCase() === 'long';
    
    if (stop != null && !Number.isNaN(entry) && !Number.isNaN(stop)) {
        const risk = Math.abs(entry - stop);
        if (target != null && !Number.isNaN(target) && risk > 0) {
            const plannedReward = isLong ? (target - entry) : (entry - target);
            plannedRR = (plannedReward / risk).toFixed(2);
        }
        if (exit != null && !Number.isNaN(exit) && risk > 0) {
            const actualReward = isLong ? (exit - entry) : (entry - exit);
            actualRR = (actualReward / risk).toFixed(2);
        }
    }
    if (plannedRR) {
        rrDisplay += ` | Planned R:R: ${plannedRR}:1`;
    }
    if (actualRR) {
        const rrColor = parseFloat(actualRR) >= 0 ? '#4CAF50' : '#F44336';
        rrDisplay += ` | Actual R:R: <span style="color:${rrColor}">${actualRR}:1</span>`;
    }

    if (chartInfo && chartSymbol && chartDirection) {
        chartSymbol.textContent = trade.symbol;
        chartDirection.innerHTML = (trade.direction || '').toUpperCase() + rrDisplay;
        chartDirection.style.color = isLong ? '#4CAF50' : '#ef5350';
        chartInfo.style.display = 'block';
    }
    if (header) {
        header.innerHTML = `📈 Price Chart`;
    }

    // Log trade details for debugging
    console.log('Trade details:', {
        symbol: trade.symbol,
        entry: trade.entry_price,
        exit: trade.exit_price,
        stop: trade.stop_loss,
        target: trade.target_price,
        plannedRR: plannedRR ? `${plannedRR}:1` : 'N/A',
        actualRR: actualRR ? `${actualRR}:1` : 'N/A'
    });
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

// Handle window resize (Chart.js handles this automatically with responsive: true)
window.addEventListener('resize', () => {
    if (journalChart) {
        journalChart.resize();
    }
});

// Export to global scope
window.loadTradeChart = loadTradeChart;
window.initializeJournalChart = initializeJournalChart;
