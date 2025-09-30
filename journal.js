document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    await loadTrades();

    document.getElementById('tradeForm').addEventListener('submit', saveTrade);
    document.querySelectorAll('.emotion-tags .tag').forEach(tag => {
        tag.addEventListener('click', () => tag.classList.toggle('selected'));
    });
});

async function loadTrades() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const statusFilter = document.getElementById('filterStatus').value;
    const sortOrder = document.getElementById('sortOrder').value;

    let query = supabase.from('trades').select('*').eq('user_id', user.id);

    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    query = query.order('created_at', { ascending: sortOrder === 'asc' });

    const { data: trades, error } = await query;

    if (error) {
        console.error('Error fetching trades:', error);
        return;
    }

    const container = document.getElementById('tradeList');
    container.innerHTML = '';

    if (trades.length === 0) {
        container.innerHTML = '<p class="no-trades">No trades logged yet. Click "Log New Trade" to get started.</p>';
        return;
    }

    for (const trade of trades) {
        const pnl = trade.status === 'closed' ? (trade.exit_price - trade.entry_price) * trade.position_size * (trade.direction === 'short' ? -1 : 1) : 0;
        const pnlClass = pnl >= 0 ? 'profit' : 'loss';

        const tradeEl = document.createElement('div');
        tradeEl.className = 'trade-item';
        tradeEl.innerHTML = `
            <div class="trade-header">
                <span class="trade-symbol">${trade.symbol}</span>
                <span class="trade-direction ${trade.direction}">${trade.direction.toUpperCase()}</span>
                <span class="trade-status ${trade.status}">${trade.status}</span>
            </div>
            <div class="trade-body">
                <div class="trade-stat"><strong>Entry:</strong> ${trade.entry_price}</div>
                <div class="trade-stat"><strong>Exit:</strong> ${trade.exit_price || 'N/A'}</div>
                <div class="trade-stat"><strong>Size:</strong> ${trade.position_size}</div>
                <div class="trade-stat"><strong>P/L:</strong> <span class="${pnlClass}">${pnl.toFixed(2)}</span></div>
            </div>
            <div class="trade-footer">
                <div class="trade-notes">${trade.notes || ''}</div>
                <div class="trade-actions">
                    <button class="edit-btn" onclick="editTrade('${trade.id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteTrade('${trade.id}')">Delete</button>
                </div>
            </div>
        `;
        container.appendChild(tradeEl);
    }
}

async function saveTrade(e) {
    e.preventDefault();
    const user = (await supabase.auth.getUser()).data.user;

    const tradeId = document.getElementById('tradeId').value;
    const emotions = Array.from(document.querySelectorAll('.emotion-tags .tag.selected')).map(tag => tag.dataset.emotion);

    const tradeData = {
        user_id: user.id,
        symbol: document.getElementById('symbol').value,
        direction: document.getElementById('direction').value,
        entry_price: parseFloat(document.getElementById('entryPrice').value),
        exit_price: parseFloat(document.getElementById('exitPrice').value) || null,
        position_size: parseFloat(document.getElementById('positionSize').value),
        status: document.getElementById('status').value,
        notes: document.getElementById('notes').value,
        emotions: emotions
    };

    let error;
    if (tradeId) {
        ({ error } = await supabase.from('trades').update(tradeData).eq('id', tradeId));
    } else {
        ({ error } = await supabase.from('trades').insert(tradeData));
    }

    if (error) {
        console.error('Error saving trade:', error);
        alert('Could not save the trade.');
    } else {
        closeModal('tradeModal');
        await loadTrades();
    }
}

function openLogTradeModal() {
    document.getElementById('tradeForm').reset();
    document.getElementById('tradeId').value = '';
    document.getElementById('tradeModalTitle').textContent = 'Log New Trade';
    document.querySelectorAll('.emotion-tags .tag').forEach(tag => tag.classList.remove('selected'));
    openModal('tradeModal');
}

async function editTrade(id) {
    const { data: trade, error } = await supabase.from('trades').select('*').eq('id', id).single();
    if (error) return;

    document.getElementById('tradeId').value = trade.id;
    document.getElementById('symbol').value = trade.symbol;
    document.getElementById('direction').value = trade.direction;
    document.getElementById('entryPrice').value = trade.entry_price;
    document.getElementById('exitPrice').value = trade.exit_price;
    document.getElementById('positionSize').value = trade.position_size;
    document.getElementById('status').value = trade.status;
    document.getElementById('notes').value = trade.notes;
    
    document.querySelectorAll('.emotion-tags .tag').forEach(tag => {
        if (trade.emotions && trade.emotions.includes(tag.dataset.emotion)) {
            tag.classList.add('selected');
        } else {
            tag.classList.remove('selected');
        }
    });

    document.getElementById('tradeModalTitle').textContent = 'Edit Trade';
    openModal('tradeModal');
}

async function deleteTrade(id) {
    if (!confirm('Are you sure you want to delete this trade?')) return;

    const { error } = await supabase.from('trades').delete().eq('id', id);

    if (error) {
        console.error('Error deleting trade:', error);
        alert('Could not delete the trade.');
    } else {
        await loadTrades();
    }
}

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}
