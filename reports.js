document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

// --- Session KPIs (ET) ---
function renderSessionKPIs(trades) {
    const host = document.getElementById('sessionKpiBody');
    if (!host) return;
    const sessions = [
        { key: 'premkt', label: 'Premarket', start: 7*60, end: 9*60+30 },
        { key: 'open', label: 'Market Open', start: 9*60+30, end: 10*60+30 },
        { key: 'mid', label: 'Midday', start: 10*60+30, end: 15*60 },
        { key: 'power', label: 'Power Hour', start: 15*60, end: 16*60 },
        { key: 'ah', label: 'After-hours', start: 16*60, end: 20*60 }
    ];
    const agg = new Map(sessions.map(s => [s.key, { trades:0, wins:0, pl:0 }]));
    trades.forEach(t => {
        const isOption = t.trade_type === 'call' || t.trade_type === 'put';
        const mult = isOption ? 100 : 1;
        const pnl = (t.exit_price - t.entry_price) * t.position_size * mult * (t.direction === 'short' ? -1 : 1);
        const d = new Date(t.entry_time || t.created_at);
        let mins = d.getHours()*60 + d.getMinutes();
        try { if (typeof nyMinutesSinceMidnight === 'function') mins = nyMinutesSinceMidnight(d); } catch(_) {}
        const s = sessions.find(s => mins >= s.start && mins < s.end) || null;
        if (!s) return;
        const rec = agg.get(s.key); rec.trades++; rec.pl += pnl; if (pnl>0) rec.wins++; agg.set(s.key, rec);
    });
    const tiles = sessions.map(s => {
        const { trades, wins, pl } = agg.get(s.key);
        const wr = trades ? ((wins/trades)*100).toFixed(1) : '0.0';
        const pf = (() => { // compute PF using only signs as weights (approx)
            let gp=0, gl=0;
            // recompute to get true PF per session
            trades && null;
            return trades ? (wr>0 && wr<100 ? (Number(wr)/ (100-Number(wr))).toFixed(2) : (pl>0?'∞':'0.00')) : '0.00';
        })();
        return `
        <div class="kpi-item" style="background: rgba(255,255,255,0.03); border:1px solid var(--glass-border); border-radius:10px; padding:0.75rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="kpi-label" style="font-size:0.9rem; color: var(--text-secondary);">${s.label}</span>
                <span style="font-size:0.9rem; color:${pl>=0?'#34C759':'#FF453A'}; font-weight:800;">${pl>=0?'+':''}$${pl.toFixed(2)}</span>
            </div>
            <div style="margin-top:0.4rem; display:flex; gap:0.75rem; font-size:0.9rem; color:var(--text-secondary);">
                <span>Trades: <b style="color:var(--text-primary)">${trades}</b></span>
                <span>Win: <b style="color:var(--text-primary)">${wr}%</b></span>
            </div>
        </div>`;
    }).join('');
    host.innerHTML = tiles;
}

// --- Golden vs Avoid Hours ---
function renderGoldenAvoidHours(trades) {
    const host = document.getElementById('goldenHoursBody');
    if (!host) return;
    const plByHour = new Array(24).fill(0);
    const countByHour = new Array(24).fill(0);
    trades.forEach(t => {
        const d = new Date(t.entry_time || t.created_at);
        let h = d.getHours();
        try { if (typeof nyTimeParts === 'function') h = nyTimeParts(d).hour; } catch(_) {}
        const isOption = t.trade_type === 'call' || t.trade_type === 'put';
        const mult = isOption ? 100 : 1;
        const pnl = (t.exit_price - t.entry_price) * t.position_size * mult * (t.direction === 'short' ? -1 : 1);
        plByHour[h] += pnl; countByHour[h]++;
    });
    const hours = [...Array(24).keys()].map(h => ({ h, pl: plByHour[h], n: countByHour[h] }));
    const top3 = hours.slice().sort((a,b)=>b.pl-a.pl).slice(0,3);
    const bottom3 = hours.slice().sort((a,b)=>a.pl-b.pl).slice(0,3);
    const tile = (title, list, color) => `
        <div class="kpi-item" style="background: rgba(255,255,255,0.03); border:1px solid var(--glass-border); border-radius:10px; padding:0.75rem;">
            <div class="kpi-label" style="font-size:0.95rem; color:${color}; font-weight:800; margin-bottom:0.4rem;">${title}</div>
            ${list.map(x => `<div style="display:flex; justify-content:space-between; margin:0.2rem 0;">
                <span>${String(x.h).padStart(2,'0')}:00</span>
                <span style="color:${x.pl>=0?'#34C759':'#FF453A'}; font-weight:700;">${x.pl>=0?'+':''}$${x.pl.toFixed(2)}</span>
                <span style="color:var(--text-secondary);">(${x.n})</span>
            </div>`).join('')}
        </div>`;
    host.innerHTML = tile('Golden Hours', top3, '#34C759') + tile('Avoid Hours', bottom3, '#FF453A');
}

// --- Time-of-Day Heatmap (Hour × Weekday) ---
function renderTimeOfDayHeatmap(trades) {
    const host = document.getElementById('todHeatmapGrid');
    if (!host) return;
    // Build win-rate matrix
    const wins = Array.from({length:7}, () => new Array(24).fill(0));
    const totals = Array.from({length:7}, () => new Array(24).fill(0));
    trades.forEach(t => {
        const isOption = t.trade_type === 'call' || t.trade_type === 'put';
        const mult = isOption ? 100 : 1;
        const pnl = (t.exit_price - t.entry_price) * t.position_size * mult * (t.direction === 'short' ? -1 : 1);
        const d = new Date(t.entry_time || t.created_at);
        let h = d.getHours();
        let wd = d.getDay();
        try { if (typeof nyTimeParts === 'function') { const p = nyTimeParts(d); h = p.hour; } } catch(_) {}
        totals[wd][h] += 1; if (pnl > 0) wins[wd][h] += 1;
    });
    // Render grid
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let html = '<div style="display:grid; grid-template-columns: 80px repeat(24, 1fr); gap:2px;">';
    // Header row
    html += '<div></div>' + [...Array(24).keys()].map(h=>`<div style="text-align:center; font-size:0.75rem; color:var(--text-secondary);">${String(h).padStart(2,'0')}</div>`).join('');
    for (let d=0; d<7; d++) {
        html += `<div style="position:sticky; left:0; background:var(--card-bg); z-index:1; padding:2px 4px; font-weight:700;">${days[d]}</div>`;
        for (let h=0; h<24; h++) {
            const n = totals[d][h]; const w = wins[d][h];
            const wr = n ? (w/n) : 0;
            // color scale green->red
            const g = Math.round(60 + 140*wr);
            const r = Math.round(255 - 140*wr);
            const bg = `rgb(${r}, ${g}, 80)`;
            html += `<div title="${days[d]} ${String(h).padStart(2,'0')}:00 — ${n} trades, ${(wr*100).toFixed(0)}% win" style="height:22px; background:${bg}; text-align:center; font-size:0.7rem; color:#000;">${n||''}</div>`;
        }
    }
    html += '</div>';
    host.innerHTML = html;
}

// P/L by Entry Hour of Day (ET)
function renderPlByEntryHourChart(trades) {
    const canvas = document.getElementById('plByHourChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const plByHour = new Array(24).fill(0);

    trades.forEach(trade => {
        const baseISO = trade.entry_time || trade.created_at;
        const d = new Date(baseISO);
        let hour = d.getHours();
        try {
            if (typeof nyTimeParts === 'function') {
                hour = nyTimeParts(d).hour;
            }
        } catch(_) {}
        const isOption = trade.trade_type === 'call' || trade.trade_type === 'put';
        const multiplier = isOption ? 100 : 1;
        const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * multiplier * (trade.direction === 'short' ? -1 : 1);
        plByHour[hour] += pnl;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: plByHour.map((_, h) => `${String(h).padStart(2,'0')}:00`),
            datasets: [{
                label: 'Total P/L',
                data: plByHour,
                backgroundColor: plByHour.map(v => v >= 0 ? '#34C759' : '#FF453A')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => '$' + Number(v).toLocaleString() }
                }
            }
        }
    });
}

// Holding Time Stats
function renderHoldingTimeStats(trades) {
    const host = document.getElementById('holdingStatsBody');
    if (!host) return;

    const durations = []; // minutes
    const byHour = new Array(24).fill(0); // count entries per hour

    trades.forEach(trade => {
        const entryISO = trade.entry_time || trade.created_at;
        const exitISO = trade.exit_time || trade.updated_at || trade.created_at;
        const entry = new Date(entryISO);
        const exit = new Date(exitISO);
        const minutes = Math.max(0, (exit - entry) / 60000);
        durations.push(minutes);

        let hour = entry.getHours();
        try { if (typeof nyTimeParts === 'function') hour = nyTimeParts(entry).hour; } catch(_) {}
        byHour[hour] += 1;
    });

    const avg = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
    const median = (arr) => {
        if (!arr.length) return 0;
        const s = [...arr].sort((a,b)=>a-b);
        const mid = Math.floor(s.length/2);
        return s.length % 2 ? s[mid] : (s[mid-1]+s[mid])/2;
    };

    const avgMin = avg(durations);
    const medMin = median(durations);

    // Best entry hour by P/L
    const plByHour = new Array(24).fill(0);
    trades.forEach(trade => {
        const baseISO = trade.entry_time || trade.created_at;
        const d = new Date(baseISO);
        let hour = d.getHours();
        try { if (typeof nyTimeParts === 'function') hour = nyTimeParts(d).hour; } catch(_) {}
        const isOption = trade.trade_type === 'call' || trade.trade_type === 'put';
        const multiplier = isOption ? 100 : 1;
        const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * multiplier * (trade.direction === 'short' ? -1 : 1);
        plByHour[hour] += pnl;
    });
    let bestHour = 0; let bestPl = -Infinity;
    for (let h=0; h<24; h++) { if (plByHour[h] > bestPl) { bestPl = plByHour[h]; bestHour = h; } }

    // Render stat tiles
    const tiles = [
        { label: 'Avg Holding Time', value: `${Math.round(avgMin)} min` },
        { label: 'Median Holding Time', value: `${Math.round(medMin)} min` },
        { label: 'Most Profitable Hour (ET)', value: `${String(bestHour).padStart(2,'0')}:00` },
        { label: 'Trades at Best Hour', value: `${byHour[bestHour]}` }
    ];
    host.innerHTML = tiles.map(t => `
        <div class="kpi-item" style="background: rgba(255,255,255,0.03); border:1px solid var(--glass-border); border-radius:10px; padding:0.75rem; text-align:center;">
            <div class="kpi-label" style="font-size:0.85rem; color: var(--text-secondary);">${t.label}</div>
            <div class="kpi-value" style="font-size:1.4rem; font-weight:800;">${t.value}</div>
        </div>
    `).join('');
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
// Format a Date as local YYYY-MM-DD (avoids timezone shifts of toISOString)
function fmtLocalYMD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

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
    let monthPnL = 0;
    let monthTradesCount = 0;
    let monthWins = 0;
    for (const t of monthTrades) {
        const d = new Date(t.created_at);
        if (d.getFullYear() !== calendarYear || d.getMonth() !== calendarMonth) continue;
        const key = fmtLocalYMD(d); // YYYY-MM-DD (local)
        const isOption = t.trade_type === 'call' || t.trade_type === 'put';
        const multiplier = isOption ? 100 : 1;
        const pnl = (t.exit_price - t.entry_price) * t.position_size * multiplier * (t.direction === 'short' ? -1 : 1);
        const prev = dailyMap.get(key) || { pnl: 0, trades: [] };
        prev.pnl += pnl;
        prev.trades.push(t);
        dailyMap.set(key, prev);

        // Monthly summary
        monthPnL += pnl;
        monthTradesCount += 1;
        if (pnl > 0) monthWins += 1;
    }

    // Helper: compact currency for small screens
    function formatShortCurrency(value) {
        const sign = value >= 0 ? '' : '-';
        const abs = Math.abs(value);
        if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}b`;
        if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}m`;
        if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}k`;
        return `${sign}$${abs.toFixed(2)}`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(calendarYear, calendarMonth, day);
        const key = fmtLocalYMD(dateObj);
        const agg = dailyMap.get(key) || { pnl: 0, trades: [] };

        const cell = document.createElement('div');
        const hasTrades = agg.trades.length > 0;
        cell.className = 'calendar-day' + (hasTrades ? (agg.pnl >= 0 ? ' win' : ' loss') : '');
        const tradesCount = agg.trades.length;
        const pnlText = `${agg.pnl >= 0 ? '+' : ''}$${Math.abs(agg.pnl).toFixed(2)}`;
        const pnlTextShort = `${agg.pnl >= 0 ? '+' : ''}${formatShortCurrency(Math.abs(agg.pnl)).replace('-', '')}`;
        cell.innerHTML = `
            <div class="date">${day}</div>
            <div class="summary">${hasTrades ? `
                <span class="sum-trades">${tradesCount}</span>
                <span class="sum-trades-label">trades</span>
                <span class="sum-sep">•</span>
                <span class="sum-pnl">${pnlText}</span>
                <span class="sum-pnl-short">${pnlTextShort}</span>
            ` : ''}</div>
        `;
        // Tooltip for day cell
        if (hasTrades) {
            cell.setAttribute('data-tooltip', `Day: ${dateObj.toLocaleDateString()}\nP/L: ${agg.pnl >= 0 ? '+' : ''}$${agg.pnl.toFixed(2)} • Trades: ${tradesCount}`);
        } else {
            cell.setAttribute('data-tooltip', `Day: ${dateObj.toLocaleDateString()}\nNo closed trades`);
        }
        cell.onclick = () => openDayDetailsModal(dateObj, agg.trades, agg.pnl);
        grid.appendChild(cell);
    }

    // Render monthly summary
    try {
        const monthPnLEl = document.getElementById('calendarMonthSummaryPnL');
        const monthTradesEl = document.getElementById('calendarMonthSummaryTrades');
        const monthWinRateEl = document.getElementById('calendarMonthSummaryWinRate');
        if (monthPnLEl) monthPnLEl.textContent = `$${monthPnL.toFixed(2)}`;
        if (monthTradesEl) monthTradesEl.textContent = monthTradesCount.toString();
        if (monthWinRateEl) monthWinRateEl.textContent = monthTradesCount ? `${((monthWins / monthTradesCount) * 100).toFixed(1)}%` : '0%';
        if (monthPnLEl) monthPnLEl.style.color = monthPnL >= 0 ? '#34C759' : '#FF453A';
    } catch (_) {}

    // Render weekly totals list
    try {
        const weeklyContainer = document.getElementById('weeklyTotalsList');
        if (weeklyContainer) {
            weeklyContainer.innerHTML = '';
            // Build weekly buckets (Sun-Sat)
            const weeks = [];
            let current = new Date(calendarYear, calendarMonth, 1);
            const end = new Date(calendarYear, calendarMonth + 1, 0);
            // Start from the Sunday before the 1st for alignment
            current.setDate(current.getDate() - current.getDay());
            while (current <= end || current.getDay() !== 0) {
                // For each week, compute totals Sun..Sat
                let weekPnL = 0; let weekTrades = 0; let weekWins = 0;
                const startOfWeek = new Date(current);
                const days = [];
                for (let i = 0; i < 7; i++) {
                    const k = fmtLocalYMD(current);
                    const agg = dailyMap.get(k);
                    if (agg) {
                        weekPnL += agg.pnl;
                        weekTrades += agg.trades.length;
                        weekWins += agg.trades.filter(t => {
                            const isOption = t.trade_type === 'call' || t.trade_type === 'put';
                            const multiplier = isOption ? 100 : 1;
                            const pnl = (t.exit_price - t.entry_price) * t.position_size * multiplier * (t.direction === 'short' ? -1 : 1);
                            return pnl > 0;
                        }).length;
                    }
                    days.push(new Date(current));
                    current.setDate(current.getDate() + 1);
                }
                const endOfWeek = new Date(current);
                endOfWeek.setDate(endOfWeek.getDate() - 1);
                weeks.push({ start: startOfWeek, end: endOfWeek, pnl: weekPnL, trades: weekTrades, wins: weekWins });
                if (current > end && current.getDay() === 0) break;
            }
            // Render rows
            for (const w of weeks) {
                // Only show weeks that intersect selected month
                if (w.end.getMonth() !== calendarMonth && w.start.getMonth() !== calendarMonth) continue;
                const row = document.createElement('div');
                row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0.6rem; border:1px solid var(--glass-border); border-radius:8px; background: rgba(255,255,255,0.03)';
                const range = `${w.start.toLocaleDateString()} - ${w.end.toLocaleDateString()}`;
                const color = w.pnl >= 0 ? '#34C759' : '#FF453A';
                row.innerHTML = `
                    <div style="display:flex; gap:0.6rem; flex-wrap:wrap; align-items:center;">
                        <span style="font-weight:700;">${range}</span>
                        <span style="color:${color}; font-weight:800;">$${w.pnl.toFixed(2)}</span>
                    </div>
                    <div style="font-size:0.9rem; color: var(--text-secondary);">${w.trades} trades • ${w.trades ? ((w.wins / w.trades) * 100).toFixed(0) : 0}% win</div>
                `;
                // Tooltip for weekly row
                const weekWinRate = w.trades ? ((w.wins / w.trades) * 100).toFixed(0) : '0';
                row.setAttribute('data-tooltip', `Weekly summary: ${range}\nP/L: ${w.pnl >= 0 ? '+' : ''}$${w.pnl.toFixed(2)} • Trades: ${w.trades} • Win rate: ${weekWinRate}%`);
                weeklyContainer.appendChild(row);
            }

            // Draw sparklines
            try {
                // Monthly per-day PnL sparkline
                const monthCtx = document.getElementById('calendarMonthlySparkline')?.getContext('2d');
                if (monthCtx) {
                    const dailySeries = [];
                    for (let day = 1; day <= daysInMonth; day++) {
                        const dt = new Date(calendarYear, calendarMonth, day);
                        const k = fmtLocalYMD(dt);
                        const agg = dailyMap.get(k);
                        dailySeries.push(agg ? agg.pnl : 0);
                    }
                    if (window.__calendarMonthSpark) { window.__calendarMonthSpark.destroy(); }
                    window.__calendarMonthSpark = new Chart(monthCtx, {
                        type: 'line',
                        data: { labels: dailySeries.map((_, i) => i+1), datasets: [{ data: dailySeries, borderColor: '#FF9500', backgroundColor: 'rgba(255,149,0,0.12)', fill: true, pointRadius: 0, tension: 0.3 }] },
                        options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { line: { borderWidth: 2 } }, responsive: true, maintainAspectRatio: false }
                    });
                    const tot = dailySeries.reduce((a,b)=>a+b,0);
                    const totEl = document.getElementById('sparkMonthTotal');
                    if (totEl) { totEl.textContent = `$${tot.toFixed(2)}`; totEl.style.color = tot >= 0 ? '#34C759' : '#FF453A'; }
                }

                // Weekly totals sparkline
                const weekCtx = document.getElementById('calendarWeeklySparkline')?.getContext('2d');
                if (weekCtx) {
                    const weekSeries = weeks
                        .filter(w => w.end.getMonth() === calendarMonth || w.start.getMonth() === calendarMonth)
                        .map(w => w.pnl);
                    if (window.__calendarWeekSpark) { window.__calendarWeekSpark.destroy(); }
                    window.__calendarWeekSpark = new Chart(weekCtx, {
                        type: 'bar',
                        data: { labels: weekSeries.map((_, i) => `W${i+1}`), datasets: [{ data: weekSeries, backgroundColor: weekSeries.map(v => v >= 0 ? '#34C759' : '#FF453A') }] },
                        options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } }, responsive: true, maintainAspectRatio: false }
                    });
                    const best = weekSeries.length ? Math.max(...weekSeries) : 0;
                    const bestEl = document.getElementById('sparkWeekBest');
                    if (bestEl) { bestEl.textContent = `Best: $${best.toFixed(2)}`; bestEl.style.color = best >= 0 ? '#34C759' : '#FF453A'; }
                }
            } catch (_) {}
        }
    } catch (_) {}

    // Re-bind tooltips after rebuilding calendar (for month navigation)
    try { initReportTooltips(); } catch (_) {}
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
    renderPlByEntryHourChart(trades);
    renderHoldingTimeStats(trades);
    renderSessionKPIs(trades);
    renderGoldenAvoidHours(trades);
    renderTimeOfDayHeatmap(trades);

    // Initialize Performance Calendar
    allClosedTrades = trades;
    const now = new Date();
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth();
    wireCalendarNav();
    await buildPerformanceCalendar();
    // Initialize tooltips after dynamic content is in the DOM
    try { initReportTooltips(); } catch (_) {}
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
    // Profit Factor = Gross Profit / Gross Loss
    // If there are no losses but some profit, PF is ∞ (infinite)
    let profitFactor = 0;
    let profitFactorText = '0.00';
    if (grossLoss > 0) {
        profitFactor = grossProfit / grossLoss;
        profitFactorText = profitFactor.toFixed(2);
    } else if (grossProfit > 0) {
        profitFactor = Infinity;
        profitFactorText = '∞';
    }
    const avgWin = totalWins > 0 ? grossProfit / totalWins : 0;
    const avgLoss = totalLosses > 0 ? grossLoss / totalLosses : 0;

    const elements = {
        kpiTotalPl: `$${totalPl.toFixed(2)}`,
        kpiWinRate: `${winRate.toFixed(2)}%`,
        kpiProfitFactor: profitFactorText,
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
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { type: 'time', time: { unit: 'day' } } }
        }
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

// -------------------- Tooltips --------------------
function initReportTooltips() {
    const els = document.querySelectorAll('[data-tooltip]');
    if (!els.length) return;
    let bubble = document.getElementById('__reportsTooltip');
    if (!bubble) {
        bubble = document.createElement('div');
        bubble.id = '__reportsTooltip';
        bubble.className = 'tooltip-bubble';
        document.body.appendChild(bubble);
    }
    const show = (el) => {
        const text = el.getAttribute('data-tooltip');
        if (!text) return;
        bubble.textContent = text;
        const r = el.getBoundingClientRect();
        const top = window.scrollY + r.top - 10;
        const left = window.scrollX + r.left + r.width / 2;
        bubble.style.top = `${top}px`;
        bubble.style.left = `${left}px`;
        bubble.style.transform = 'translate(-50%, -8px)';
        bubble.classList.add('visible');
    };
    const hide = () => bubble.classList.remove('visible');
    els.forEach(el => {
        el.setAttribute('tabindex', '0');
        el.addEventListener('mouseenter', () => show(el));
        el.addEventListener('mouseleave', hide);
        el.addEventListener('focus', () => show(el));
        el.addEventListener('blur', hide);
        el.addEventListener('click', (e) => {
            // Mobile/tap support: toggle briefly
            e.preventDefault();
            show(el);
            setTimeout(hide, 1800);
        });
    });
}
