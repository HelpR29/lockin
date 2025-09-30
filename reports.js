document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    await generateReports();
});

async function generateReports() {
    const { data: { user } } = await supabase.auth.getUser();

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

    if (trades.length === 0) {
        // Handle no data case
        return;
    }

    // Calculate KPIs
    calculateAndDisplayKPIs(trades);

    // Render Charts
    renderPlChart(trades);
    renderWinLossChart(trades);
    renderDailyPlChart(trades);
}

function calculateAndDisplayKPIs(trades) {
    let totalPl = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    trades.forEach(trade => {
        const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * (trade.direction === 'short' ? -1 : 1);
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

    document.getElementById('kpiTotalPl').textContent = `$${totalPl.toFixed(2)}`;
    document.getElementById('kpiWinRate').textContent = `${winRate.toFixed(2)}%`;
    document.getElementById('kpiProfitFactor').textContent = profitFactor.toFixed(2);
    document.getElementById('kpiAvgWin').textContent = `$${avgWin.toFixed(2)}`;
    document.getElementById('kpiAvgLoss').textContent = `$${avgLoss.toFixed(2)}`;
}

function renderPlChart(trades) {
    const ctx = document.getElementById('plChart').getContext('2d');
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
                borderColor: 'var(--primary-orange)',
                backgroundColor: 'rgba(255, 149, 0, 0.1)',
                fill: true
            }]
        },
        options: { scales: { x: { type: 'time', time: { unit: 'day' } } } }
    });
}

function renderWinLossChart(trades) {
    const ctx = document.getElementById('winLossChart').getContext('2d');
    let wins = 0;
    let losses = 0;
    trades.forEach(trade => {
        const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * (trade.direction === 'short' ? -1 : 1);
        if (pnl > 0) wins++;
        else if (pnl < 0) losses++;
    });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Wins', 'Losses'],
            datasets: [{
                data: [wins, losses],
                backgroundColor: ['var(--accent-green)', '#FF453A'],
                borderColor: 'var(--card-bg)',
                borderWidth: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderDailyPlChart(trades) {
    const ctx = document.getElementById('dailyPlChart').getContext('2d');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyPl = new Array(7).fill(0);

    trades.forEach(trade => {
        const dayIndex = new Date(trade.created_at).getDay();
        const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * (trade.direction === 'short' ? -1 : 1);
        dailyPl[dayIndex] += pnl;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Total P/L',
                data: dailyPl,
                backgroundColor: dailyPl.map(pnl => pnl >= 0 ? 'var(--accent-green)' : '#FF453A')
            }]
        }
    });
}
