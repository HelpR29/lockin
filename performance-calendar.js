// Performance Calendar for Dashboard
// Minimal, self-contained calendar renderer reused from reports, without sparklines.

let dashCalYear = null;
let dashCalMonth = null; // 0-11
const dashCalCache = new Map(); // key: YYYY-MM -> trades[]

function fmtLocalYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function wireDashboardCalendarNav() {
  const prevBtn = document.getElementById('calendarPrev');
  const nextBtn = document.getElementById('calendarNext');
  if (prevBtn) prevBtn.onclick = async () => { await shiftDashboardCalendar(-1); };
  if (nextBtn) nextBtn.onclick = async () => { await shiftDashboardCalendar(1); };
}

async function shiftDashboardCalendar(deltaMonths) {
  if (dashCalMonth == null || dashCalYear == null) return;
  dashCalMonth += deltaMonths;
  if (dashCalMonth < 0) { dashCalMonth = 11; dashCalYear -= 1; }
  if (dashCalMonth > 11) { dashCalMonth = 0; dashCalYear += 1; }
  await buildDashboardPerformanceCalendar();
}

async function buildDashboardPerformanceCalendar() {
  const grid = document.getElementById('performanceCalendar');
  const label = document.getElementById('calendarMonthLabel');
  if (!grid || dashCalMonth == null || dashCalYear == null) return;

  grid.innerHTML = '';

  try {
    const monthName = new Date(dashCalYear, dashCalMonth, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
    if (label) label.textContent = monthName;
  } catch (_) { if (label) label.textContent = `${dashCalMonth + 1}/${dashCalYear}`; }

  // Headers
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < 7; i++) {
    const h = document.createElement('div');
    h.style.cssText = 'text-align:center; font-weight:700; color: var(--text-secondary); padding:0.25rem 0;';
    h.textContent = daysShort[i];
    grid.appendChild(h);
  }

  const firstDay = new Date(dashCalYear, dashCalMonth, 1);
  const startOffset = firstDay.getDay();
  for (let i = 0; i < startOffset; i++) {
    const blank = document.createElement('div');
    blank.style.cssText = 'min-height:72px;';
    grid.appendChild(blank);
  }

  const daysInMonth = new Date(dashCalYear, dashCalMonth + 1, 0).getDate();

  // Fetch month trades (cache per month)
  const keyMonth = `${dashCalYear}-${String(dashCalMonth + 1).padStart(2, '0')}`;
  let monthTrades = dashCalCache.get(keyMonth);
  if (!monthTrades) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const startISO = new Date(dashCalYear, dashCalMonth, 1).toISOString();
    const endISO = new Date(dashCalYear, dashCalMonth + 1, 1).toISOString();
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .gte('created_at', startISO)
      .lt('created_at', endISO)
      .order('created_at', { ascending: true });
    if (error) { console.warn('Dashboard calendar month fetch failed:', error); monthTrades = []; }
    else { monthTrades = data || []; }
    dashCalCache.set(keyMonth, monthTrades);
  }

  // Build daily aggregation map for selected month
  const dailyMap = new Map();
  let monthPnL = 0;
  let monthTradesCount = 0;
  let monthWins = 0;
  for (const t of monthTrades) {
    const d = new Date(t.created_at);
    if (d.getFullYear() !== dashCalYear || d.getMonth() !== dashCalMonth) continue;
    const key = fmtLocalYMD(d);
    const isOption = t.trade_type === 'call' || t.trade_type === 'put';
    const multiplier = isOption ? 100 : 1;
    const pnl = (t.exit_price - t.entry_price) * t.position_size * multiplier * (t.direction === 'short' ? -1 : 1);
    const prev = dailyMap.get(key) || { pnl: 0, trades: [] };
    prev.pnl += pnl; prev.trades.push(t);
    dailyMap.set(key, prev);
    monthPnL += pnl; monthTradesCount += 1; if (pnl > 0) monthWins += 1;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(dashCalYear, dashCalMonth, day);
    const key = fmtLocalYMD(dateObj);
    const agg = dailyMap.get(key) || { pnl: 0, trades: [] };

    const cell = document.createElement('div');
    const hasTrades = agg.trades.length > 0;
    cell.className = 'calendar-day' + (hasTrades ? (agg.pnl >= 0 ? ' win' : ' loss') : '');
    const tradesCount = agg.trades.length;
    const pnlText = `${agg.pnl >= 0 ? '+' : ''}$${Math.abs(agg.pnl).toFixed(2)}`;
    cell.innerHTML = `
      <div class="date">${day}</div>
      <div class="summary">${hasTrades ? `
        <span class="sum-trades">${tradesCount}</span>
        <span class="sum-trades-label">trades</span>
        <span class="sum-sep">•</span>
        <span class="sum-pnl">${pnlText}</span>
      ` : ''}</div>`;
    cell.setAttribute('data-tooltip', hasTrades
      ? `Day: ${dateObj.toLocaleDateString()}\nP/L: ${agg.pnl >= 0 ? '+' : ''}$${agg.pnl.toFixed(2)} • Trades: ${tradesCount}`
      : `Day: ${dateObj.toLocaleDateString()}\nNo closed trades`);
    cell.onclick = () => openDashboardDayDetailsModal(dateObj, agg.trades, agg.pnl);
    grid.appendChild(cell);
  }

  // Monthly summary
  try {
    const monthPnLEl = document.getElementById('calendarMonthSummaryPnL');
    const monthTradesEl = document.getElementById('calendarMonthSummaryTrades');
    const monthWinRateEl = document.getElementById('calendarMonthSummaryWinRate');
    if (monthPnLEl) { monthPnLEl.textContent = `$${monthPnL.toFixed(2)}`; monthPnLEl.style.color = monthPnL >= 0 ? '#34C759' : '#FF453A'; }
    if (monthTradesEl) monthTradesEl.textContent = monthTradesCount.toString();
    if (monthWinRateEl) monthWinRateEl.textContent = monthTradesCount ? `${((monthWins / monthTradesCount) * 100).toFixed(1)}%` : '0%';
  } catch (_) {}
}

function openDashboardDayDetailsModal(dateObj, trades, totalPnl) {
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
    </div>`;
  document.body.appendChild(modal);
}

async function initDashboardCalendar() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date();
    dashCalYear = now.getFullYear();
    dashCalMonth = now.getMonth();
    wireDashboardCalendarNav();
    await buildDashboardPerformanceCalendar();
  } catch (e) { console.warn('initDashboardCalendar failed', e); }
}

document.addEventListener('DOMContentLoaded', initDashboardCalendar);
