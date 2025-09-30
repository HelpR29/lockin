document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        await generateReports();
    } catch (error) {
        console.error('Error initializing reports:', error);
        alert('Failed to load reports. Please refresh the page.');
    }
});

async function generateReports() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching trades for reports:', error);
        return;
    }

    console.log(`📊 Reports: Loaded ${trades.length} closed trades`, trades);
    
    if (trades.length === 0) {
        console.warn('No closed trades found for reports');
        document.querySelector('.reports-grid').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                <p>No closed trades yet. Close some trades to see your reports!</p>
            </div>
        `;
        return;
    }

    // Calculate KPIs (always available)
    calculateAndDisplayKPIs(trades);

    // Render all charts (always available)
    renderPlChart(trades);
    renderWinLossChart(trades);
    renderDailyPlChart(trades);
    } catch (error) {
        console.error('Error generating reports:', error);
        throw error;
    }
}

function calculateAndDisplayKPIs(trades) {
    if (!trades || trades.length === 0) return;
    
    let totalPl = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    trades.forEach(trade => {
        // Account for options contract multiplier (100 shares per contract)
        const isOption = trade.trade_type === 'call' || trade.trade_type === 'put';
        const multiplier = isOption ? 100 : 1;
        const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * multiplier * (trade.direction === 'short' ? -1 : 1);
        totalPl += pnl;
        if (pnl > 0) {
            totalWins++;
            grossProfit += pnl;
        } else if (pnl < 0) {
            totalLosses++;
            grossLoss += Math.abs(pnl);
        }
    });

    const winRate = totalWins + totalLosses > 0 ? (totalWins / (totalWins + totalLosses)) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    const avgWin = totalWins > 0 ? grossProfit / totalWins : 0;
    const avgLoss = totalLosses > 0 ? grossLoss / totalLosses : 0;

    const elements = {
        kpiTotalPl: `$${totalPl.toFixed(2)}`,
        kpiWinRate: `${winRate.toFixed(2)}%`,
        kpiProfitFactor: profitFactor.toFixed(2),
        kpiAvgWin: `$${avgWin.toFixed(2)}`,
        kpiAvgLoss: `$${avgLoss.toFixed(2)}`
    };
    
    Object.entries(elements).forEach(([id, text]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    });
}

function renderPlChart(trades) {
    const canvas = document.getElementById('plChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let cumulativePl = 0;
    const data = trades.map(trade => {
        const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * (trade.direction === 'short' ? -1 : 1);
        cumulativePl += pnl;
        return { x: new Date(trade.created_at), y: cumulativePl };
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Cumulative P/L',
                data: data,
                borderColor: '#FF9500',
                backgroundColor: 'rgba(255, 149, 0, 0.1)',
                fill: true
            }]
        },
        options: { scales: { x: { type: 'time', time: { unit: 'day' } } } }
    });
}

function renderWinLossChart(trades) {
    const canvas = document.getElementById('winLossChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let wins = 0;
    let losses = 0;
    trades.forEach(trade => {
        // Account for options contract multiplier (100 shares per contract)
        const isOption = trade.trade_type === 'call' || trade.trade_type === 'put';
        const multiplier = isOption ? 100 : 1;
        const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * multiplier * (trade.direction === 'short' ? -1 : 1);
        if (pnl > 0) wins++;
        else if (pnl < 0) losses++;
    });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Wins', 'Losses'],
            datasets: [{
                data: [wins, losses],
                backgroundColor: ['#34C759', '#FF453A'],
                borderColor: '#2C2C2E',
                borderWidth: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderDailyPlChart(trades) {
    const canvas = document.getElementById('dailyPlChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyPl = new Array(7).fill(0);

    trades.forEach(trade => {
        const dayIndex = new Date(trade.created_at).getDay();
        // Account for options contract multiplier (100 shares per contract)
        const isOption = trade.trade_type === 'call' || trade.trade_type === 'put';
        const multiplier = isOption ? 100 : 1;
        const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * multiplier * (trade.direction === 'short' ? -1 : 1);
        dailyPl[dayIndex] += pnl;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Total P/L',
                data: dailyPl,
                backgroundColor: dailyPl.map(pnl => pnl >= 0 ? '#34C759' : '#FF453A')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}
