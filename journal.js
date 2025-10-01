let isPremiumUser = false;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    await checkPremiumStatus();
    gatePremiumAnalytics();

    await loadTrades();

    document.getElementById('tradeForm').addEventListener('submit', saveTrade);
    // Toggle Exit field based on Status
    const statusSel = document.getElementById('status');
    if (statusSel) {
        statusSel.addEventListener('change', handleStatusChange);
        handleStatusChange();
    }
    document.querySelectorAll('.emotion-tags .tag').forEach(tag => {
        tag.addEventListener('click', () => tag.classList.toggle('selected'));
    });
});

// Toggle Exit field and hint visibility based on Status
function handleStatusChange() {
    const statusSel = document.getElementById('status');
    const exitGroup = document.getElementById('exitGroup');
    const exitHint = document.getElementById('exitHint');
    const isClosed = statusSel && statusSel.value === 'closed';
    if (exitGroup) exitGroup.style.display = isClosed ? 'block' : 'none';
    if (exitHint) exitHint.style.display = isClosed ? 'none' : 'block';
}

async function checkPremiumStatus() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_premium')
            .eq('user_id', user.id)
            .single();

        isPremiumUser = !!profile?.is_premium;
        console.log('💎 Premium status (journal):', isPremiumUser ? 'PREMIUM' : 'FREE');
    } catch (error) {
        console.error('Error checking premium status:', error);
        isPremiumUser = false;
    }
}

function gatePremiumAnalytics() {
    const premiumEls = document.querySelectorAll('[data-premium="true"]');
    const analyzeBtn = document.getElementById('analyzeBtn');

    premiumEls.forEach(el => {
        if (isPremiumUser) {
            unlockPremiumElement(el);
        } else {
            if (!el.classList.contains('premium-locked')) {
                el.classList.add('premium-locked');
                el.style.position = 'relative';
                el.style.filter = 'grayscale(0.6)';
                el.style.opacity = '0.65';

                const mask = document.createElement('div');
                mask.className = 'premium-mask';
                mask.style.position = 'absolute';
                mask.style.inset = '0';
                mask.style.display = 'flex';
                mask.style.alignItems = 'center';
                mask.style.justifyContent = 'center';
                mask.style.background = 'rgba(0,0,0,0.3)';
                mask.style.borderRadius = '12px';
                mask.style.fontSize = '0.75rem';
                mask.style.letterSpacing = '0.02em';
                mask.style.color = 'var(--text-secondary)';
                mask.style.cursor = 'pointer';
                mask.textContent = '🔒 Premium Feature';
                mask.addEventListener('click', () => {
                    if (typeof showPremiumModal === 'function') {
                        showPremiumModal();
                    } else {
                        alert('Unlock this feature with LockIn Premium.');
                    }
                });
                el.appendChild(mask);
            }
        }
    });

    if (!isPremiumUser && analyzeBtn) {
        analyzeBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (typeof showPremiumModal === 'function') {
                showPremiumModal();
            } else {
                alert('Upgrade to Premium to unlock AI Trading Analysis.');
            }
        }, { once: true });
        analyzeBtn.classList.add('premium-locked-button');
        analyzeBtn.querySelector('span#analyzeBtnText').textContent = 'Upgrade for AI Analysis';
    } else if (isPremiumUser && analyzeBtn) {
        analyzeBtn.classList.remove('premium-locked-button');
        analyzeBtn.querySelector('span#analyzeBtnText').textContent = 'Analyze My Trades';
        analyzeBtn.onclick = () => generateAIAnalysis();
    }
}

function unlockPremiumElement(el) {
    el.classList.remove('premium-locked');
    el.style.filter = '';
    el.style.opacity = '';
    const mask = el.querySelector('.premium-mask');
    if (mask) mask.remove();
}

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
        const aiSummary = summarizeTradeNotes(trade.notes || '', trade);
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
                ${aiSummary ? `<div class="ai-notes-summary" style="margin-top: 0.5rem; padding: 0.75rem; border: 1px solid var(--glass-border); background: rgba(255,149,0,0.06); border-radius: 10px;">
                    <div style="font-weight: 600; color: var(--primary); margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.35rem;">🧠 AI Summary</div>
                    ${aiSummary}
                </div>` : ''}
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
        const statusVal = document.getElementById('status').value;
        const exitVal = statusVal === 'closed' ? (parseFloat(document.getElementById('exitPrice').value) || null) : null;
        
        const tradeData = {
            user_id: user.id,
            symbol: document.getElementById('symbol').value,
            trade_type: tradeType,
            direction: document.getElementById('direction').value,
            entry_price: parseFloat(document.getElementById('entryPrice').value),
            exit_price: exitVal,
            stop_loss: parseFloat(document.getElementById('stopLoss').value) || null,
            target_price: parseFloat(document.getElementById('targetPrice').value) || null,
            strike_price: (tradeType === 'call' || tradeType === 'put') ? parseFloat(document.getElementById('strikePrice').value) || null : null,
            expiry_date: (tradeType === 'call' || tradeType === 'put') ? document.getElementById('expiryDate').value || null : null,
            position_size: parseFloat(document.getElementById('positionSize').value),
            status: statusVal,
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
    
    // Show trade type fields based on selection
    const tradeTypeSelect = document.getElementById('tradeType');
    if (tradeTypeSelect) {
        tradeTypeSelect.dispatchEvent(new Event('change'));
    }
    // Default status to Open and hide exit field
    const statusSel = document.getElementById('status');
    if (statusSel) {
        statusSel.value = 'open';
        handleStatusChange();
    }
    
    openModal('tradeModal');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
    }
}

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

// Close trade - supports partial closes
async function closeTrade(tradeId) {
    try {
        // Get the trade details first
        const { data: trade, error: fetchError } = await supabase
            .from('trades')
            .select('*')
            .eq('id', tradeId)
            .single();
        
        if (fetchError || !trade) {
            console.error('Error fetching trade:', fetchError);
            alert('Failed to load trade details.');
            return;
        }
        
        // Ask how many contracts/shares to close
        const maxSize = trade.position_size;
        const closeAmount = prompt(
            `📊 Close Position: ${trade.symbol}\n\n` +
            `Entry Price: $${trade.entry_price}\n` +
            `Position Size: ${maxSize} ${trade.trade_type === 'stock' ? 'shares' : 'contracts'}\n\n` +
            `How many do you want to close? (1-${maxSize})`,
            maxSize
        );
        
        if (!closeAmount) return; // User cancelled
        
        const closeSize = parseFloat(closeAmount);
        
        // Validate input
        if (isNaN(closeSize) || closeSize <= 0 || closeSize > maxSize) {
            alert(`Invalid amount. Please enter a number between 1 and ${maxSize}.`);
            return;
        }
        
        // ALWAYS ask for actual exit price (real-time market price)
        const exitPriceInput = prompt(
            `💰 Exit Price\n\n` +
            `Closing: ${closeSize} ${trade.trade_type === 'stock' ? 'shares' : 'contracts'}\n` +
            `Entry was: $${trade.entry_price}\n\n` +
            `What price did you sell at?`,
            trade.entry_price
        );
        
        if (!exitPriceInput) return;
        
        const exitPrice = parseFloat(exitPriceInput);
        if (isNaN(exitPrice) || exitPrice <= 0) {
            alert('Invalid exit price. Please enter a valid number.');
            return;
        }
        
        // Calculate P&L for this partial close
        const isOption = trade.trade_type === 'call' || trade.trade_type === 'put';
        const multiplier = isOption ? 100 : 1;
        const pnl = (exitPrice - trade.entry_price) * closeSize * multiplier * (trade.direction === 'short' ? -1 : 1);
        const pnlPercent = ((exitPrice - trade.entry_price) / trade.entry_price * 100).toFixed(2);
        
        const isFullClose = closeSize === maxSize;
        
        // Show detailed confirmation with P&L
        if (!confirm(
            `${isFullClose ? '✅ CLOSE ENTIRE POSITION' : '📊 PARTIAL CLOSE'}\n\n` +
            `Symbol: ${trade.symbol}\n` +
            `Closing: ${closeSize} of ${maxSize} ${trade.trade_type === 'stock' ? 'shares' : 'contracts'}\n` +
            `${isFullClose ? '' : `Remaining: ${maxSize - closeSize}\n`}\n` +
            `Entry Price: $${trade.entry_price}\n` +
            `Exit Price: $${exitPrice}\n` +
            `Price Change: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent}%\n\n` +
            `💰 P/L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}\n\n` +
            `This action cannot be undone.`
        )) {
            return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (isFullClose) {
            // Full close - just update status and exit price
            const { error } = await supabase
                .from('trades')
                .update({ 
                    status: 'closed',
                    exit_price: exitPrice
                })
                .eq('id', tradeId);
            
            if (error) throw error;
            
        } else {
            // Partial close - create new closed trade and update original
            
            // Check if there are already partial closes for this symbol
            const { data: relatedTrades } = await supabase
                .from('trades')
                .select('exit_price, position_size, status')
                .eq('user_id', user.id)
                .eq('symbol', trade.symbol)
                .eq('entry_price', trade.entry_price)
                .eq('status', 'closed');
            
            // Calculate running average exit price
            let totalClosedSize = closeSize;
            let totalClosedValue = exitPrice * closeSize;
            
            if (relatedTrades && relatedTrades.length > 0) {
                relatedTrades.forEach(rt => {
                    if (rt.exit_price) {
                        totalClosedSize += rt.position_size;
                        totalClosedValue += rt.exit_price * rt.position_size;
                    }
                });
            }
            
            const avgExitPrice = totalClosedValue / totalClosedSize;
            
            // 1. Create a new "closed" trade for the partial exit
            const partialCloseNote = 
                `📊 Partial Close #${(relatedTrades?.length || 0) + 1}\n` +
                `Closed: ${closeSize}/${maxSize} @ $${exitPrice}\n` +
                `P/L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent}%)\n` +
                `Average Exit: $${avgExitPrice.toFixed(2)}\n` +
                `Remaining: ${maxSize - closeSize}\n\n` +
                `Original Entry Notes:\n${trade.notes || 'None'}`;
            
            const { error: insertError } = await supabase
                .from('trades')
                .insert({
                    user_id: user.id,
                    symbol: trade.symbol,
                    trade_type: trade.trade_type,
                    direction: trade.direction,
                    entry_price: trade.entry_price,
                    exit_price: exitPrice,
                    stop_loss: trade.stop_loss,
                    target_price: trade.target_price,
                    strike_price: trade.strike_price,
                    expiry_date: trade.expiry_date,
                    position_size: closeSize,
                    status: 'closed',
                    notes: partialCloseNote,
                    emotions: trade.emotions
                });
            
            if (insertError) throw insertError;

            // 2. Update original trade to reduce position size
            const remainingSize = maxSize - closeSize;
            const updateNote = 
                `${trade.notes || ''}\n\n` +
                `━━━━━━━━━━━━━━━━━\n` +
                `📉 Partial Close History:\n` +
                `[${new Date().toLocaleString()}]\n` +
                `Closed: ${closeSize} @ $${exitPrice}\n` +
                `P/L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}\n` +
                `Avg Exit So Far: $${avgExitPrice.toFixed(2)}\n` +
                `Remaining: ${remainingSize}`;
            
            const { error: updateError } = await supabase
                .from('trades')
                .update({ 
                    position_size: remainingSize,
                    notes: updateNote
                })
                .eq('id', tradeId);
            
            if (updateError) throw updateError;
        }
        
        // Show detailed success message
        if (isFullClose) {
            alert(
                `✅ TRADE FULLY CLOSED\n\n` +
                `${trade.symbol}: ${closeSize} ${trade.trade_type === 'stock' ? 'shares' : 'contracts'}\n` +
                `Entry: $${trade.entry_price}\n` +
                `Exit: $${exitPrice}\n` +
                `Change: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent}%\n\n` +
                `💰 P/L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}\n\n` +
                `+10 XP earned! 🎯`
            );
        } else {
            alert(
                `📊 PARTIAL CLOSE SUCCESSFUL\n\n` +
                `${trade.symbol}\n` +
                `Closed: ${closeSize} @ $${exitPrice}\n` +
                `Remaining: ${maxSize - closeSize}\n\n` +
                `💰 This Close: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}\n` +
                `📈 Change: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent}%\n\n` +
                `+10 XP earned! 🎯`
            );
        }

        // Award XP for closing trade
        if (user) {
            const { data: progress } = await supabase
                .from('user_progress')
                .select('experience, level')
                .eq('user_id', user.id)
                .single();
            
            const newXP = (progress?.experience || 0) + 10;
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
        
        // Reload trades
        await loadTrades();
        
        // Update progress tracker
        if (typeof updatePnLChart === 'function') {
            await updatePnLChart();
        }
        
        // Reset status on open modal
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.value = 'open';
    } catch (error) {
        console.error('Error closing trade:', error);
        alert('An error occurred. Please try again.');
    }
}

// -------- Local, free AI-like summarization of notes --------
function summarizeTradeNotes(text, trade) {
    if (!text || text.trim().length < 12) return '';
    const lower = text.toLowerCase();
    const found = [];
    // Direction & context
    if (trade?.direction) found.push(`<div>• Direction: <strong>${trade.direction.toUpperCase()}</strong></div>`);
    // Reason cues
    const cues = [
        {k:'relative strength', l:'Relative strength present'},
        {k:'breakout', l:'Breakout setup'},
        {k:'pullback', l:'Pullback entry'},
        {k:'trendline', l:'Trendline factor'},
        {k:'support', l:'Support level involved'},
        {k:'resistance', l:'Resistance level involved'},
        {k:'earnings', l:'Earnings-related catalyst'},
        {k:'news', l:'News/catalyst driven'},
        {k:'triangle', l:'Triangle pattern context'},
        {k:'wedge', l:'Wedge pattern context'},
        {k:'double top', l:'Double top risk'},
        {k:'double bottom', l:'Double bottom support'}
    ];
    cues.forEach(c=>{ if (lower.includes(c.k)) found.push(`<div>• ${c.l}</div>`); });
    // Risk/target extraction
    const targetMatch = lower.match(/target\s*(price)?\s*[:=@]?\s*([$]?)(\d+(?:\.\d+)?)/);
    const stopMatch = lower.match(/(stop|sl|stop\s*loss)\s*[:=@]?\s*([$]?)(\d+(?:\.\d+)?)/);
    if (targetMatch) found.push(`<div>• Target: <strong>${targetMatch[2]}${parseFloat(targetMatch[3]).toFixed(2)}</strong></div>`);
    if (stopMatch) found.push(`<div>• Stop: <strong>${stopMatch[2]}${parseFloat(stopMatch[3]).toFixed(2)}</strong></div>`);
    // Timeframe
    const tf = ['daily','weekly','1m','3m','5m','15m','30m','1h','4h','intraday'];
    const tfHit = tf.find(t=> lower.includes(t));
    if (tfHit) found.push(`<div>• Timeframe: <strong>${tfHit.toUpperCase()}</strong></div>`);
    // Sentiment heuristic
    const posWords = ['strong','good','bull','bullish','breakout','uptrend','strength'];
    const negWords = ['weak','bad','bear','bearish','rejection','downtrend','selloff'];
    const posScore = posWords.reduce((s,w)=> s + (lower.includes(w)?1:0),0);
    const negScore = negWords.reduce((s,w)=> s + (lower.includes(w)?1:0),0);
    let sentiment = 'Neutral';
    if (posScore > negScore) sentiment = 'Bullish';
    else if (negScore > posScore) sentiment = 'Bearish';
    found.push(`<div>• Sentiment: <strong>${sentiment}</strong></div>`);
    // TL;DR line - shorten first sentence
    const firstSentence = text.split(/[.!?]/).find(s=> s.trim().length>0) || '';
    const tldr = firstSentence.trim().slice(0, 140) + (firstSentence.length>140 ? '…' : '');
    return `<div style="color: var(--text-primary);">${found.join('')}<div>• TL;DR: ${tldr}</div></div>`;
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
// calculateLevelFromXP is now imported from progress.js (loaded before journal.js)
// No need to redefine it here

// Export functions to global scope for HTML onclick handlers
window.openLogTradeModal = openLogTradeModal;
window.editTrade = editTrade;
window.deleteTrade = deleteTrade;
window.openModal = openModal;
window.closeModal = closeModal;
window.viewTradeOnChart = viewTradeOnChart;
window.closeTrade = closeTrade;
window.recalculateUserLevel = recalculateUserLevel;
window.calculateLevelFromXP = calculateLevelFromXP;

console.log('✅ Journal functions exported to window:', {
    openLogTradeModal: typeof window.openLogTradeModal,
    closeTrade: typeof window.closeTrade,
    openModal: typeof window.openModal,
    closeModal: typeof window.closeModal
});