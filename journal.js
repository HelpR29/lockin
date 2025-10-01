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

// Stub functions for future implementation
async function editTrade(tradeId) {
    console.log('Edit trade functionality coming soon:', tradeId);
    alert('Edit trade feature coming soon!');
}

async function deleteTrade(tradeId) {
    if (!confirm('Are you sure you want to delete this trade? This action cannot be undone.')) {
        return;
    }
    console.log('Delete trade functionality coming soon:', tradeId);
    alert('Delete trade feature coming soon!');
}

async function loadTrades() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        const statusFilter = document.getElementById('filterStatus')?.value || 'all';
        const sortOrder = document.getElementById('sortOrder')?.value || 'desc';

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
        if (!container) return;
    container.innerHTML = '';

    if (trades.length === 0) {
        container.innerHTML = '<p class="no-trades">No trades logged yet. Click "Log New Trade" to get started.</p>';
        return;
    }

    for (const trade of trades) {
        // Calculate P&L - for options, multiply by 100 (contract multiplier)
        let pnl = 0;
        if (trade.status === 'closed' && trade.exit_price) {
            const isOption = trade.trade_type === 'call' || trade.trade_type === 'put';
            const multiplier = isOption ? 100 : 1; // Options = 100 shares per contract
            pnl = (trade.exit_price - trade.entry_price) * trade.position_size * multiplier * (trade.direction === 'short' ? -1 : 1);
            console.log(`Trade ${trade.symbol}: type=${trade.trade_type}, status=${trade.status}, entry=${trade.entry_price}, exit=${trade.exit_price}, size=${trade.position_size}, multiplier=${multiplier}, pnl=$${pnl}`);
        } else {
            console.log(`Trade ${trade.symbol}: status=${trade.status}, exit_price=${trade.exit_price} - P&L not calculated (trade not closed or no exit)`);
        }
        const pnlClass = pnl >= 0 ? 'profit' : 'loss';

        const tradeEl = document.createElement('div');
        tradeEl.className = 'trade-item';
        tradeEl.style.cursor = 'pointer';
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
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                    <div class="trade-timestamp" style="font-size: 0.75rem; color: var(--text-muted);">
                        ${new Date(trade.created_at).toLocaleString()}
                    </div>
                    ${trade.status === 'open' ? `
                        <button class="cta-secondary" onclick="event.stopPropagation(); closeTrade('${trade.id}')" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                            ✅ Close Trade
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Click anywhere on trade to view chart
        tradeEl.addEventListener('click', () => {
            viewTradeOnChart(trade.id);
        });
        
        container.appendChild(tradeEl);
        }
        
        // Update P&L chart after loading trades
        if (typeof updatePnLChart === 'function') {
            await updatePnLChart();
        }
    } catch (error) {
        console.error('Error loading trades:', error);
        alert('Failed to load trades. Please refresh the page.');
    }
}

async function saveTrade(e) {
    e.preventDefault();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Please log in to save trades.');
            return;
        }

        const tradeId = document.getElementById('tradeId').value;
        const emotions = Array.from(document.querySelectorAll('.emotion-tags .tag.selected')).map(tag => tag.dataset.emotion);

        const tradeType = document.getElementById('tradeType').value;
        
        const tradeData = {
            user_id: user.id,
            symbol: document.getElementById('symbol').value,
            trade_type: tradeType,
            direction: document.getElementById('direction').value,
            entry_price: parseFloat(document.getElementById('entryPrice').value),
            exit_price: parseFloat(document.getElementById('exitPrice').value) || null,
            stop_loss: parseFloat(document.getElementById('stopLoss').value) || null,
            target_price: parseFloat(document.getElementById('targetPrice').value) || null,
            strike_price: (tradeType === 'call' || tradeType === 'put') ? parseFloat(document.getElementById('strikePrice').value) || null : null,
            expiry_date: (tradeType === 'call' || tradeType === 'put') ? document.getElementById('expiryDate').value || null : null,
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
            
            // Check for rule violations automatically
            if (typeof checkTradeForViolations === 'function') {
                const { data: savedTrade } = await supabase
                    .from('trades')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                
                if (savedTrade) {
                    const violations = await checkTradeForViolations(savedTrade);
                    if (violations && violations.length > 0) {
                        const violationMessages = violations.map(v => `• ${v.rule.rule}: ${v.reason}`).join('\n');
                        alert(`⚠️ Rule Violations Detected:\n\n${violationMessages}\n\n-30 XP penalty applied for each violation.`);
                    }
                }
            }
            
            await loadTrades();
            
            // Update progress tracker immediately after saving
            if (typeof updatePnLChart === 'function') {
                await updatePnLChart();
            }
        }
    } catch (error) {
        console.error('Error saving trade:', error);
        alert('An error occurred. Please try again.');
    }
}

function openLogTradeModal() {
    document.getElementById('tradeForm').reset();
    document.getElementById('tradeId').value = '';
    document.getElementById('tradeModalTitle').textContent = 'Log New Trade';
    document.querySelectorAll('.emotion-tags .tag').forEach(tag => tag.classList.remove('selected'));
    openModal('tradeModal');

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
    }
}

async function viewTradeOnChart(tradeId) {
    try {
        const { data: trade, error } = await supabase.from('trades').select('*').eq('id', tradeId).single();
        if (error || !trade) {
            console.error('Error fetching trade:', error);
            return;
        }
        
        // Load chart with trade markers
        if (typeof loadTradeChart === 'function') {
            await loadTradeChart(trade);
        }
    } catch (error) {
        console.error('Error viewing trade on chart:', error);
    }
}

// Close an open trade (only changes status, maintains discipline)
async function closeTrade(tradeId) {
    if (!confirm('Are you sure you want to close this trade? This action cannot be undone.')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('trades')
            .update({ status: 'closed' })
            .eq('id', tradeId);
        
        if (error) {
            console.error('Error closing trade:', error);
            alert('Failed to close trade. Please try again.');
        } else {
            // Reload trades to show updated status and P&L
            await loadTrades();
            
            // Award XP for closing trade (10 XP per closed trade)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: progress } = await supabase
                    .from('user_progress')
                    .select('experience, level')
                    .eq('user_id', user.id)
                    .single();
                
                // Calculate new XP and level
                const newXP = (progress?.experience || 0) + 10;
                
                // Calculate level from XP
                const levelInfo = calculateLevelFromXP(newXP);
                
                await supabase
                    .from('user_progress')
                    .update({ 
                        experience: newXP,
                        level: levelInfo.level,
                        next_level_xp: levelInfo.nextLevelXP
                    })
                    .eq('user_id', user.id);
            }
            
            // Update progress tracker
            if (typeof updatePnLChart === 'function') {
                await updatePnLChart();
            }
            
            alert('Trade closed successfully! P&L calculated. +10 XP earned!');
        }
    } catch (error) {
        console.error('Error closing trade:', error);
        alert('An error occurred. Please try again.');
    }
}

// Recalculate user level based on current XP (for fixing existing users)
async function recalculateUserLevel() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Please log in first.');
            return;
        }
        
        const { data: progress } = await supabase
            .from('user_progress')
            .select('experience')
            .eq('user_id', user.id)
            .single();
        
        if (!progress) {
            alert('No progress data found.');
            return;
        }
        
        const levelInfo = calculateLevelFromXP(progress.experience);
        
        const { error } = await supabase
            .from('user_progress')
            .update({
                level: levelInfo.level,
                next_level_xp: levelInfo.nextLevelXP
            })
            .eq('user_id', user.id);
        
        if (error) {
            console.error('Error updating level:', error);
            alert('Failed to recalculate level.');
        } else {
            alert(`✅ Level recalculated! Current level: ${levelInfo.level}, XP: ${progress.experience}`);
        }
    } catch (error) {
        console.error('Error recalculating level:', error);
        alert('Error recalculating level.');
    }
}

// Export functions to global scope for HTML onclick handlers
window.openLogTradeModal = openLogTradeModal;
window.editTrade = editTrade;
window.deleteTrade = deleteTrade;
window.openModal = openModal;
window.closeModal = closeModal;
window.viewTradeOnChart = viewTradeOnChart;
window.closeTrade = closeTrade;
window.recalculateUserLevel = recalculateUserLevel;

}