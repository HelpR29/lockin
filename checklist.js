// Premarket Checklist module
// Persists to Supabase if tables exist; falls back to localStorage gracefully

const DEFAULT_CHECKLIST = [
  'Review economic calendar / major news',
  'Define A+ setups and avoid others',
  'Set max loss and risk per trade',
  'Mark key levels and plan entries/exits',
  'Confirm no trading during first 15 minutes',
  'Rehearse stop-loss execution and partials',
  'Check broader market trend and correlations'
];

const CHECKLIST_LS_KEY = 'lockin_premarket_checklist_v1';
const CHECKLIST_LS_DAILY_KEY = 'lockin_premarket_daily_v1';

async function getUserIdOrNull() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (_) {
    return null;
  }
}

// Utility: attempt Supabase call and surface boolean
async function trySupabase(fn) {
  try {
    return await fn();
  } catch (_) {
    return null;
  }
}

// Load or initialize master checklist items for a user
async function loadChecklistItems() {
  const userId = await getUserIdOrNull();
  if (!userId) return DEFAULT_CHECKLIST.map((text, idx) => ({ id: `local-${idx}`, text, sort: idx, is_active: true }));

  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('premarket_checklist_items')
      .select('*')
      .eq('user_id', userId)
      .order('sort', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      // Seed defaults (ignore failures if table missing)
      const seed = DEFAULT_CHECKLIST.map((text, idx) => ({ user_id: userId, text, sort: idx, is_active: true }));
      try { await supabase.from('premarket_checklist_items').insert(seed); } catch (_) {}
      return seed.map((r, idx) => ({ id: `seed-${idx}`, text: r.text, sort: r.sort, is_active: true }));
    }
    return data;
  } catch (e) {
    // Fallback to localStorage
    let ls = [];
    try { ls = JSON.parse(localStorage.getItem(CHECKLIST_LS_KEY) || '[]'); } catch(_) {}
    if (!ls || ls.length === 0) {
      ls = DEFAULT_CHECKLIST.map((text, idx) => ({ id: `local-${idx}`, text, sort: idx, is_active: true }));
      localStorage.setItem(CHECKLIST_LS_KEY, JSON.stringify(ls));
    }
    return ls;
  }
}

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Load today's checklist states
async function loadDailyChecklist() {
  const userId = await getUserIdOrNull();
  const date = todayYMD();

  if (!userId) {
    // Local storage only
    const all = JSON.parse(localStorage.getItem(CHECKLIST_LS_DAILY_KEY) || '{}');
    return all[date] || {};
  }

  try {
    const { data, error } = await supabase
      .from('premarket_checklist_daily')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);
    if (error) throw error;
    const map = {};
    (data || []).forEach(r => { map[r.item_id] = { morning_checked: !!r.morning_checked, eod_confirmed: !!r.eod_confirmed }; });
    return map;
  } catch (e) {
    const all = JSON.parse(localStorage.getItem(CHECKLIST_LS_DAILY_KEY) || '{}');
    return all[date] || {};
  }
}

async function saveDailyChecklistState(itemId, fields) {
  const userId = await getUserIdOrNull();
  const date = todayYMD();
  if (!userId) {
    const all = JSON.parse(localStorage.getItem(CHECKLIST_LS_DAILY_KEY) || '{}');
    all[date] = all[date] || {};
    all[date][itemId] = { ...(all[date][itemId] || {}), ...fields };
    localStorage.setItem(CHECKLIST_LS_DAILY_KEY, JSON.stringify(all));
    return;
  }
  try {
    // Upsert record
    const payload = { user_id: userId, date, item_id: itemId, ...fields };
    await supabase.from('premarket_checklist_daily').upsert(payload, { onConflict: 'user_id,date,item_id', ignoreDuplicates: false });
  } catch (e) {
    // Fallback to LS
    const all = JSON.parse(localStorage.getItem(CHECKLIST_LS_DAILY_KEY) || '{}');
    all[date] = all[date] || {};
    all[date][itemId] = { ...(all[date][itemId] || {}), ...fields };
    localStorage.setItem(CHECKLIST_LS_DAILY_KEY, JSON.stringify(all));
  }
}

// Render dashboard card
async function renderPremarketChecklistCard() {
  const card = document.getElementById('premarketChecklistCard');
  if (!card) return;

  const [items, dailyMap] = await Promise.all([loadChecklistItems(), loadDailyChecklist()]);

  card.innerHTML = `
    <div class="stat-card" style="grid-column: 1 / -1; padding: 1.25rem;">
      <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 0.75rem;">
        <h2 class="section-title" style="font-size: 1.25rem; margin:0; display:flex; align-items:center; gap:0.5rem;">📋 Premarket Checklist <span style="font-size:0.9rem; color: var(--text-secondary);">${todayYMD()}</span></h2>
        <button class="cta-secondary" id="toggleEodMode" style="padding:0.4rem 0.8rem;">EOD Confirm</button>
      </div>
      <div id="premarketList" style="display:flex; flex-direction:column; gap:0.5rem;"></div>
      <div style="margin-top:0.75rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
        <button class="cta-primary" id="markAllMorning" style="padding:0.5rem 1rem;">Mark All (Morning)</button>
        <button class="cta-primary" id="confirmAllEod" style="padding:0.5rem 1rem;">Confirm All (EOD)</button>
      </div>
    </div>
  `;

  let eodMode = false;
  const list = document.getElementById('premarketList');

  function renderList() {
    list.innerHTML = items.filter(i => i.is_active !== false).map(item => {
      const state = dailyMap[item.id] || {};
      const morning = !!state.morning_checked;
      const eod = !!state.eod_confirmed;
      return `
        <label style="display:flex; align-items:center; gap:0.6rem; background: rgba(255,255,255,0.03); border:1px solid var(--glass-border); border-radius:8px; padding:0.6rem 0.75rem;">
          <input type="checkbox" data-id="${item.id}" data-mode="morning" ${morning ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer; ${eodMode ? 'display:none;' : ''}">
          <input type="checkbox" data-id="${item.id}" data-mode="eod" ${eod ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer; ${eodMode ? '' : 'display:none;'}">
          <span style="flex:1;">${item.text}</span>
          <span style="font-size:0.8rem; color:${morning ? '#34C759' : '#8E8E93'};">AM</span>
          <span style="font-size:0.8rem; color:${eod ? '#34C759' : '#8E8E93'};">EOD</span>
        </label>
      `;
    }).join('');
  }

  renderList();

  card.querySelector('#toggleEodMode').addEventListener('click', () => {
    eodMode = !eodMode;
    card.querySelector('#toggleEodMode').textContent = eodMode ? 'AM Marking' : 'EOD Confirm';
    renderList();
  });

  list.addEventListener('change', async (e) => {
    const cb = e.target.closest('input[type="checkbox"]');
    if (!cb) return;
    const id = cb.getAttribute('data-id');
    const mode = cb.getAttribute('data-mode');
    const checked = cb.checked;

    dailyMap[id] = dailyMap[id] || {};
    if (mode === 'morning') dailyMap[id].morning_checked = checked;
    if (mode === 'eod') dailyMap[id].eod_confirmed = checked;
    await saveDailyChecklistState(id, dailyMap[id]);
  });

  card.querySelector('#markAllMorning').addEventListener('click', async () => {
    for (const item of items) {
      dailyMap[item.id] = { ...(dailyMap[item.id] || {}), morning_checked: true };
      await saveDailyChecklistState(item.id, dailyMap[item.id]);
    }
    renderList();
  });

  card.querySelector('#confirmAllEod').addEventListener('click', async () => {
    for (const item of items) {
      dailyMap[item.id] = { ...(dailyMap[item.id] || {}), eod_confirmed: true };
      await saveDailyChecklistState(item.id, dailyMap[item.id]);
    }
    renderList();
  });

  // Add item
  card.querySelector('#addChecklistItemBtn').addEventListener('click', async () => {
    const input = document.getElementById('newChecklistText');
    const text = (input.value || '').trim();
    if (!text) return;
    const newItem = await createChecklistItem(text, items.length);
    if (newItem) {
      items.push(newItem);
      input.value = '';
      renderList();
    }
  });

  // Edit/Delete actions
  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if (action === 'edit') {
      const current = items.find(i => String(i.id) === String(id));
      const newText = prompt('Edit checklist item:', current?.text || '');
      if (newText && newText.trim() && newText !== current?.text) {
        const ok = await updateChecklistItem(id, { text: newText.trim() });
        if (ok !== false) {
          items = items.map(it => it.id == id ? { ...it, text: newText.trim() } : it);
          renderList();
        }
      }
    } else if (action === 'delete') {
      if (!confirm('Delete this item?')) return;
      const ok = await deleteChecklistItem(id);
      if (ok !== false) {
        items = items.filter(it => String(it.id) !== String(id));
        renderList();
      }
    }
  });
}

window.renderPremarketChecklistCard = renderPremarketChecklistCard;

// Analytics helper: fetch last N days summary
async function fetchPremarketAdherence(days = 30) {
  const userId = await getUserIdOrNull();
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

  if (!userId) {
    // Compute from LS
    const all = JSON.parse(localStorage.getItem(CHECKLIST_LS_DAILY_KEY) || '{}');
    const series = [];
    const items = await loadChecklistItems();
    const activeIds = items.filter(i => i.is_active !== false).map(i => i.id);
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate()+1)) {
      const key = ymd(dt);
      const day = all[key] || {};
      let total = activeIds.length;
      let adhered = activeIds.filter(id => day[id]?.morning_checked && day[id]?.eod_confirmed).length;
      series.push({ date: key, adhered, total });
    }
    return series;
  }

  try {
    // Load active items and daily rows within range
    const [itemsRes, dailyRes] = await Promise.all([
      supabase.from('premarket_checklist_items').select('id,is_active').eq('user_id', userId),
      supabase
        .from('premarket_checklist_daily')
        .select('*')
        .eq('user_id', userId)
        .gte('date', ymd(start))
        .lte('date', ymd(end))
    ]);

    const items = (itemsRes.data || []).filter(i => i.is_active !== false).map(i => i.id);
    const daily = dailyRes.data || [];
    const byDate = {};
    daily.forEach(r => {
      if (!items.includes(r.item_id)) return; // only count active items
      byDate[r.date] = byDate[r.date] || { adhered: 0 };
      if (r.morning_checked && r.eod_confirmed) byDate[r.date].adhered += 1;
    });

    const series = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate()+1)) {
      const key = ymd(dt);
      const adhered = byDate[key]?.adhered || 0;
      series.push({ date: key, adhered, total: items.length });
    }
    return series;
  } catch (e) {
    // Fallback LS
    return fetchPremarketAdherence.call({});
  }
}

window.fetchPremarketAdherence = fetchPremarketAdherence;

// ---- CRUD helpers for checklist items ----
function loadLsItems() {
  try { return JSON.parse(localStorage.getItem(CHECKLIST_LS_KEY) || '[]'); } catch(_) { return []; }
}
function saveLsItems(items) { try { localStorage.setItem(CHECKLIST_LS_KEY, JSON.stringify(items)); } catch(_) {} }

async function createChecklistItem(text, sort) {
  const userId = await getUserIdOrNull();
  if (!userId) {
    const items = loadLsItems();
    const id = `ls-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const newItem = { id, text, sort: sort ?? items.length, is_active: true };
    items.push(newItem);
    saveLsItems(items);
    return newItem;
  }
  try {
    const { data, error } = await supabase
      .from('premarket_checklist_items')
      .insert({ user_id: userId, text, sort: sort ?? 0, is_active: true })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    // Fallback LS
    const items = loadLsItems();
    const id = `ls-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const newItem = { id, text, sort: sort ?? items.length, is_active: true };
    items.push(newItem);
    saveLsItems(items);
    return newItem;
  }
}

async function updateChecklistItem(id, fields) {
  const userId = await getUserIdOrNull();
  if (!userId || String(id).startsWith('ls-') || String(id).startsWith('local-') || String(id).startsWith('seed-')) {
    const items = loadLsItems().map(it => String(it.id) === String(id) ? { ...it, ...fields } : it);
    saveLsItems(items);
    return true;
  }
  try {
    const { error } = await supabase
      .from('premarket_checklist_items')
      .update({ ...fields })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (e) {
    return false;
  }
}

async function deleteChecklistItem(id) {
  const userId = await getUserIdOrNull();
  if (!userId || String(id).startsWith('ls-') || String(id).startsWith('local-') || String(id).startsWith('seed-')) {
    const items = loadLsItems().filter(it => String(it.id) !== String(id));
    saveLsItems(items);
    // Remove any daily states for this LS id
    const all = JSON.parse(localStorage.getItem(CHECKLIST_LS_DAILY_KEY) || '{}');
    Object.keys(all).forEach(date => { if (all[date][id]) delete all[date][id]; });
    localStorage.setItem(CHECKLIST_LS_DAILY_KEY, JSON.stringify(all));
    return true;
  }
  try {
    const { error } = await supabase
      .from('premarket_checklist_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (e) {
    return false;
  }
}
