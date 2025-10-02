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

// Globals for Performance Calendar
let allClosedTrades = [];
let calendarYear = null;
let calendarMonth = null; // 0-11
const calendarCache = new Map(); // key: YYYY-MM -> trades[]

// ===== Performance Calendar (global scope) =====
function wireCalendarNav() {
    const prevBtn = document.getElementById('calendarPrev');
    const nextBtn = document.getElementById('calendarNext');
    if (prevBtn) prevBtn.onclick = async () => { await shiftCalendar(-1); };
    if (nextBtn) nextBtn.onclick = async () => { await shiftCalendar(1); };
}

async function shiftCalendar(deltaMonths) {
    if (calendarMonth == null || calendarYear == null) return;
    calendarMonth += deltaMonths;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear -= 1; }
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear += 1; }
    await buildPerformanceCalendar();
}

async function buildPerformanceCalendar() {
    const grid = document.getElementById('performanceCalendar');
    const label = document.getElementById('calendarMonthLabel');
    if (!grid || calendarMonth == null || calendarYear == null) return;

    // Clear
    grid.innerHTML = '';

    // Month label
    try {
        const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
        if (label) label.textContent = monthName;
    } catch (_) { if (label) label.textContent = `${calendarMonth + 1}/${calendarYear}`; }

    // Headers
    const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
        const h = document.createElement('div');
        h.style.cssText = 'text-align:center; font-weight:700; color: var(--text-secondary); padding:0.25rem 0;';
        h.textContent = daysShort[i];
        grid.appendChild(h);
    }

    // First day offset
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const startOffset = firstDay.getDay();
    for (let i = 0; i < startOffset; i++) {
        const blank = document.createElement('div');
        blank.style.cssText = 'min-height:72px;';
        grid.appendChild(blank);
    }

    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    // Fetch month trades (cache per month)
    const keyMonth = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;
    let monthTrades = calendarCache.get(keyMonth);
    if (!monthTrades) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const startISO = new Date(calendarYear, calendarMonth, 1).toISOString();
        const endISO = new Date(calendarYear, calendarMonth + 1, 1).toISOString();
        const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'closed')
            .gte('created_at', startISO)
            .lt('created_at', endISO)
            .order('created_at', { ascending: true });
        if (error) {
            console.warn('Calendar month fetch failed:', error);
            monthTrades = [];
        } else {
            monthTrades = data || [];
        }
        calendarCache.set(keyMonth, monthTrades);
    }

    // Build daily aggregation map for selected month
    const dailyMap = new Map();
    for (const t of monthTrades) {
        const d = new Date(t.created_at);
        if (d.getFullYear() !== calendarYear || d.getMonth() !== calendarMonth) continue;
        const key = d.toISOString().slice(0,10); // YYYY-MM-DD
        const isOption = t.trade_type === 'call' || t.trade_type === 'put';
        const multiplier = isOption ? 100 : 1;
        const pnl = (t.exit_price - t.entry_price) * t.position_size * multiplier * (t.direction === 'short' ? -1 : 1);
        const prev = dailyMap.get(key) || { pnl: 0, trades: [] };
        prev.pnl += pnl;
        prev.trades.push(t);
        dailyMap.set(key, prev);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(calendarYear, calendarMonth, day);
        const key = dateObj.toISOString().slice(0,10);
        const agg = dailyMap.get(key) || { pnl: 0, trades: [] };

        const cell = document.createElement('div');
        cell.className = 'calendar-day' + (agg.trades.length ? (agg.pnl >= 0 ? ' win' : ' loss') : '');
        cell.innerHTML = `
            <div class="date">${day}</div>
            <div class="summary">${agg.trades.length} trade${agg.trades.length === 1 ? '' : 's'}${agg.trades.length ? ` • $${agg.pnl.toFixed(2)}` : ''}</div>
        `;
        cell.onclick = () => openDayDetailsModal(dateObj, agg.trades, agg.pnl);
        grid.appendChild(cell);
    }
}

function openDayDetailsModal(dateObj, trades, totalPnl) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';

    const dateStr = dateObj.toLocaleDateString();
    const listHtml = trades.length ? trades.map(t => {
        const isOption = t.trade_type === 'call' || t.trade_type === 'put';
        const multiplier = isOption ? 100 : 1;
        const pnl = (t.exit_price - t.entry_price) * t.position_size * multiplier * (t.direction === 'short' ? -1 : 1);
        const color = pnl >= 0 ? '#34C759' : '#FF453A';
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; border-bottom:1px solid var(--glass-border);">
                <div style="font-weight:600;">${t.symbol} <span style="color:${t.direction==='short'?'#F44336':'#4CAF50'}; font-size:0.8rem;">${t.direction.toUpperCase()}</span></div>
                <div style="color:${color}; font-weight:700;">${pnl>=0?'+':''}$${pnl.toFixed(2)}</div>
            </div>`;
    }).join('') : '<div style="color: var(--text-secondary); padding:1rem;">No trades this day.</div>';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 560px;">
            <span class="close-button" onclick="this.closest('.modal').remove()">&times;</span>
            <h2 style="margin-bottom:0.5rem;">${dateStr}</h2>
            <div style="font-size:0.9rem; color: var(--text-secondary); margin-bottom:0.75rem;">Total P/L: <span style="font-weight:700; color:${totalPnl>=0?'#34C759':'#FF453A'}">${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}</span></div>
            <div style="max-height: 420px; overflow:auto; border:1px solid var(--glass-border); border-radius:12px;">
                ${listHtml}
            </div>
            <div style="text-align:right; margin-top:1rem;"><button class="cta-primary" onclick="this.closest('.modal').remove()">Close</button></div>
        </div>
    `;
    document.body.appendChild(modal);
}
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
        const gridHost = document.querySelector('.reports-grid');
        if (gridHost) {
            gridHost.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                <p>No closed trades yet. Close some trades to see your reports!</p>
            </div>`;
        }
        // Initialize Performance Calendar even with zero trades
        allClosedTrades = [];
        const now = new Date();
        calendarYear = now.getFullYear();
        calendarMonth = now.getMonth();
        wireCalendarNav();
        await buildPerformanceCalendar();
        return;
    }

    // Generate psychology report FIRST (most important!)
    if (typeof generatePsychologyReport === 'function') {
        await generatePsychologyReport();
    }

    // Calculate KPIs (always available)
    calculateAndDisplayKPIs(trades);

    // Render all charts (always available)
    renderPlChart(trades);
    renderWinLossChart(trades);
    renderDailyPlChart(trades);

    // Initialize Performance Calendar
    allClosedTrades = trades;
    const now = new Date();
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth();
    wireCalendarNav();
    await buildPerformanceCalendar();
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
        const isOption = trade.trade_type === 'call' || trade.trade_type === 'put';
        const multiplier = isOption ? 100 : 1;
        const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * multiplier * (trade.direction === 'short' ? -1 : 1);
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
