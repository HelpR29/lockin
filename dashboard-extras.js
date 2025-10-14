// Dashboard Extras: Recent Activity, Profile, Settings, Leaderboard, Social Sharing

// Quick Share Button (for when user cracks a glass)
async function showQuickShareButton() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [progressRes, customRes] = await Promise.all([
        supabase.from('user_progress').select('*').eq('user_id', user.id).single(),
        supabase.from('user_customization').select('*').eq('user_id', user.id).single()
    ]);

    const progress = progressRes.data;
    const username = user.user_metadata?.full_name || 'Trader';

    // Show share prompt
    if (confirm('🎉 Glass cracked! Share your achievement?')) {
        await shareCard('completion', {
            username,
            completions: progress.beers_cracked,
            streak: progress.current_streak || 0,
            discipline: 100 // Calculate from trades/violations
        });
    }
}

function playDing() {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.24);
        setTimeout(() => { try { ctx.close(); } catch(_) {} }, 400);
    } catch (_) {}
}

function playSoftBuzz() {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = 180;
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.3);
        setTimeout(() => { try { ctx.close(); } catch(_) {} }, 500);
    } catch (_) {}
}

// Daily Flow: quick check-in + optional trade and crack/spill
async function openDailyFlow() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:520px;">
                <span class="close-button" onclick="this.closest('.modal').remove()">&times;</span>
                <h2 style="margin:0 0 0.75rem 0; display:flex; align-items:center; gap:0.5rem;">
                    <span>🍺</span>
                    <span>Log Today</span>
                </h2>
                <div style="display:grid; gap:0.75rem;">
                    <label style="display:flex; justify-content:space-between; align-items:center; gap:1rem;">
                        <span>Ticker</span>
                        <input id="dfSymbol" type="text" placeholder="e.g., TSLA or BTC/USD" style="background: var(--card-bg); color:#fff; border:1px solid var(--glass-border); border-radius:8px; padding:0.45rem 0.6rem; width: 240px;" />
                    </label>
                    <label style="display:flex; justify-content:space-between; align-items:center; gap:1rem;">
                        <span>Result (%)</span>
                        <input id="dfResult" type="number" step="any" placeholder="e.g., 2.3 or -1.5" style="background: var(--card-bg); color:#fff; border:1px solid var(--glass-border); border-radius:8px; padding:0.45rem 0.6rem; width: 160px; text-align:right;" />
                    </label>
                    <div>
                        <div style="font-size:0.9rem; color: var(--text-secondary); margin-bottom:0.35rem;">RuleGuard</div>
                        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                            <label style="display:flex; align-items:center; gap:0.35rem; background: rgba(80,227,194,0.12); border:1px solid #50E3C2; padding:0.35rem 0.6rem; border-radius:999px; cursor:pointer;">
                                <input type="radio" name="dfGuard" value="ok" checked /> ✅
                            </label>
                            <label style="display:flex; align-items:center; gap:0.35rem; background: rgba(255,193,7,0.12); border:1px solid #FFC107; padding:0.35rem 0.6rem; border-radius:999px; cursor:pointer;">
                                <input type="radio" name="dfGuard" value="warn" /> ⚠️
                            </label>
                            <label style="display:flex; align-items:center; gap:0.35rem; background: rgba(255,69,58,0.12); border:1px solid #FF453A; padding:0.35rem 0.6rem; border-radius:999px; cursor:pointer;">
                                <input type="radio" name="dfGuard" value="fail" /> ❌
                            </label>
                            <label style="display:flex; align-items:center; gap:0.35rem; background: rgba(255,255,255,0.08); border:1px solid var(--glass-border); padding:0.35rem 0.6rem; border-radius:999px; cursor:pointer;">
                                <input type="radio" name="dfGuard" value="auto" /> 🤖 Auto
                            </label>
                        </div>
                    </div>
                    <label style="display:flex; justify-content:space-between; align-items:center; gap:1rem;">
                        <span>Mood</span>
                        <select id="dfMood" style="background: var(--card-bg); color:#fff; border:1px solid var(--glass-border); border-radius:8px; padding:0.45rem 0.6rem; width: 180px;">
                            <option value="😌 Calm">😌 Calm</option>
                            <option value="😎 Confident">😎 Confident</option>
                            <option value="🙂 Neutral">🙂 Neutral</option>
                            <option value="😠 Frustrated">😠 Frustrated</option>
                            <option value="😢 Disappointed">😢 Disappointed</option>
                        </select>
                    </label>
                    <label style="display:flex; flex-direction:column; gap:0.4rem;">
                        <span>Reflection (optional)</span>
                        <input id="dfNote" type="text" maxlength="180" placeholder="1 line — e.g., Exited too early, need patience." style="background: var(--card-bg); color:#fff; border:1px solid var(--glass-border); border-radius:8px; padding:0.55rem 0.6rem;" />
                    </label>
                </div>
                <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem;">
                    <button class="cta-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="cta-primary" id="dfSubmitBtn">Log It</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const submitBtn = modal.querySelector('#dfSubmitBtn');
        if (submitBtn) submitBtn.addEventListener('click', async () => {
            try {
                submitBtn.disabled = true;
                await (async function _handleSubmit() {
                    const sym = (document.getElementById('dfSymbol')?.value || '').trim();
                    const pRaw = (document.getElementById('dfResult')?.value || '').trim();
                    const p = Number(pRaw);
                    let guard = (document.querySelector('input[name="dfGuard"]:checked')?.value || 'ok');
                    const mood = document.getElementById('dfMood')?.value || '🙂 Neutral';
                    const note = document.getElementById('dfNote')?.value || '';

                    const { data: goals } = await supabase
                        .from('user_goals')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('is_active', true)
                        .single();

                    const hasPercent = !Number.isNaN(p);
                    const starting = Number(goals?.current_capital || 0);
                    const gainPct = hasPercent ? p : 0;
                    const ending = starting > 0 ? (starting * (1 + (gainPct / 100))) : starting;
                    const pnlAbs = starting > 0 ? (starting * (gainPct / 100)) : 0;

                    let tradeInserted = false;
                    let insertedTrade = null;
                    if (sym) {
                        const entry = 100;
                        const exit = hasPercent ? (100 * (1 + (gainPct / 100))) : 100;
                        let posSize = (starting > 0) ? (starting / 100) : 1;
                        if (!Number.isFinite(posSize) || posSize <= 0) posSize = 1;
                        const trade = {
                            user_id: user.id,
                            symbol: sym,
                            trade_type: 'stock',
                            direction: 'long',
                            entry_price: entry,
                            exit_price: exit,
                            position_size: Number(posSize.toFixed(2)),
                            status: 'closed',
                            notes: note || null,
                            emotions: [mood],
                            entry_time: new Date().toISOString(),
                            exit_time: new Date().toISOString()
                        };
                        const { data: inserted, error: tErr } = await supabase.from('trades').insert(trade).select().single();
                        if (!tErr && inserted) { tradeInserted = true; insertedTrade = inserted; }
                    }

                    // Auto RuleGuard
                    if (guard === 'auto') {
                        if (insertedTrade && typeof checkTradeForViolations === 'function') {
                            try {
                                const v = await checkTradeForViolations(insertedTrade);
                                guard = (Array.isArray(v) && v.length > 0) ? 'fail' : 'ok';
                            } catch (_) { guard = 'warn'; }
                        } else {
                            guard = 'warn';
                        }
                    }

                    const guardMap = { ok: 10, warn: 7, fail: 4 };
                    const discipline_rating = guardMap[guard] ?? 8;

                    try {
                        await performDailyCheckIn(user.id, {
                            discipline_rating,
                            followed_rules: guard === 'ok',
                            traded_today: tradeInserted,
                            trades_count: tradeInserted ? 1 : 0,
                            win_rate: hasPercent ? (p > 0 ? 100 : (p < 0 ? 0 : 50)) : null,
                            profit_loss: pnlAbs,
                            notes: note,
                            emotions: [mood]
                        });
                    } catch (_) { /* ignore */ }

                    if (goals) {
                        const target = Number(goals.target_percent_per_beer || 8);
                        const maxLoss = Number(goals.max_loss_percent || 2);
                        if (guard === 'ok' && hasPercent && p >= target) {
                            try { await crackBeer(user.id, {
                                starting_balance: starting,
                                ending_balance: ending,
                                gain_amount: pnlAbs,
                                gain_percent: gainPct,
                                target_percent: target,
                                trades_count: tradeInserted ? 1 : 0,
                                notes: note
                            }); } catch(_) {}
                            showToast('🍺 You cracked one bottle!');
                            try { if (typeof fireConfetti === 'function') fireConfetti(); } catch(_) {}
                            try { playDing(); } catch(_) {}
                        } else if ((guard === 'fail') || (hasPercent && p <= -maxLoss)) {
                            try { await spillBeer(user.id, {
                                starting_balance: starting,
                                ending_balance: ending,
                                loss_amount: Math.abs(pnlAbs),
                                loss_percent: Math.abs(gainPct),
                                max_loss_percent: maxLoss,
                                violations: guard === 'fail' ? ['User-reported rule break'] : [],
                                trades_count: tradeInserted ? 1 : 0,
                                notes: note
                            }); } catch(_) {}
                            showToast('🍺 Beer spilled! No worries — tomorrow’s another chance.');
                            try { playSoftBuzz(); } catch(_) {}
                        }
                    }

                    try { await updateXPBar(); } catch(_) {}
                    try { await loadUserProgress(user.id); } catch(_) {}
                    try { if (typeof initDashboardCalendar === 'function') await initDashboardCalendar(); else if (typeof buildDashboardPerformanceCalendar === 'function') await buildDashboardPerformanceCalendar(); } catch(_) {}
                })();
                modal.remove();
            } catch (e) {
                console.error(e);
                alert('Could not log your day.');
            } finally {
                submitBtn.disabled = false;
            }
        });
    } catch (e) { console.error('openDailyFlow failed', e); }
}

function showToast(msg) {
    try {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.top = '16px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.zIndex = '10000';
        toast.style.background = 'rgba(34,34,36,0.9)';
        toast.style.backdropFilter = 'blur(8px)';
        toast.style.border = '1px solid rgba(255,149,0,0.4)';
        toast.style.borderRadius = '12px';
        toast.style.padding = '10px 14px';
        toast.style.color = '#fff';
        toast.style.fontSize = '0.95rem';
        toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
        toast.textContent = msg;
        document.body.appendChild(toast);
        toast.animate([
            { opacity: 0, transform: 'translate(-50%, -8px)' },
            { opacity: 1, transform: 'translate(-50%, 0)' }
        ], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
        setTimeout(() => {
            toast.animate([
                { opacity: 1, transform: 'translate(-50%, 0)' },
                { opacity: 0, transform: 'translate(-50%, -8px)' }
            ], { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' })
            .onfinish = () => toast.remove();
        }, 1800);
    } catch (_) {}
}

// Permanently delete account and all data
async function deleteAccount() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const confirmText = prompt('Type DELETE to permanently delete your account. This cannot be undone.');
        if (confirmText !== 'DELETE') return alert('Deletion cancelled.');
        if (!confirm('This will permanently remove your data and sign you out. Continue?')) return;

        // Best-effort delete all user data across tables
        const ops = [];
        const uid = user.id;
        ops.push(supabase.from('notifications').delete().eq('user_id', uid));
        ops.push(supabase.from('share_history').delete().eq('user_id', uid));
        ops.push(supabase.from('daily_stats').delete().eq('user_id', uid));
        ops.push(supabase.from('beer_spills').delete().eq('user_id', uid));
        ops.push(supabase.from('beer_completions').delete().eq('user_id', uid));
        ops.push(supabase.from('user_goals').delete().eq('user_id', uid));
        ops.push(supabase.from('user_progress').delete().eq('user_id', uid));
        ops.push(supabase.from('user_stars').delete().eq('user_id', uid));
        ops.push(supabase.from('user_achievements').delete().eq('user_id', uid));
        ops.push(supabase.from('rule_violations').delete().eq('user_id', uid));
        ops.push(supabase.from('trading_rules').delete().eq('user_id', uid));
        ops.push(supabase.from('trades').delete().eq('user_id', uid));
        ops.push(supabase.from('user_customization').delete().eq('user_id', uid));
        ops.push(supabase.from('user_onboarding').delete().eq('user_id', uid));
        // Remove follows both ways
        ops.push(supabase.from('follows').delete().eq('follower_id', uid));
        ops.push(supabase.from('follows').delete().eq('following_id', uid));
        // Finally profile
        ops.push(supabase.from('user_profiles').delete().eq('user_id', uid));
        await Promise.allSettled(ops);

        // Remove avatar files in storage (best-effort)
        try {
            const list = await supabase.storage.from('avatars').list(uid, { limit: 100 });
            const files = list?.data || [];
            if (files.length) {
                const paths = files.map(f => `${uid}/${f.name}`);
                await supabase.storage.from('avatars').remove(paths);
            }
        } catch (e) { console.warn('Avatar storage cleanup failed', e); }

        // Try to delete Auth user via Edge Function (best-effort)
        try {
            if (supabase?.functions?.invoke) {
                await supabase.functions.invoke('delete-user', { body: {} });
            }
        } catch (e) { console.warn('Auth user deletion failed', e); }

        // Sign out and clear caches
        try { await supabase.auth.signOut(); } catch(_) {}
        localStorage.clear();
        sessionStorage.clear();
        alert('✅ Your account and data have been deleted.');
        window.location.replace('/index.html');
    } catch (e) {
        console.error('deleteAccount failed', e);
        alert('Failed to delete account. Please try again.');
    }
}

// Load Recent Activity (trades)
async function loadRecentActivity() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: trades, error } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) {
            console.error('Error loading recent activity:', error);
            return;
        }
        
        const activityList = document.getElementById('recentActivityList');
        if (!activityList) return;
        
        if (!trades || trades.length === 0) {
            activityList.innerHTML = '<div class="activity-empty"><p>No activity yet. Start by logging your first trade!</p></div>';
            return;
        }
        
        activityList.innerHTML = trades.map(trade => {
            // Calculate P&L - for options, multiply by 100
            let pnl = 0;
            if (trade.exit_price) {
                const isOption = trade.trade_type === 'call' || trade.trade_type === 'put';
                const multiplier = isOption ? 100 : 1;
                pnl = (trade.exit_price - trade.entry_price) * trade.position_size * multiplier * (trade.direction === 'short' ? -1 : 1);
            }
            const pnlClass = pnl >= 0 ? 'profit' : 'loss';
            const time = new Date(trade.created_at).toLocaleString();
            
            return `
                <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div>
                            <strong style="font-size: 1.125rem;">${trade.symbol}</strong>
                            <span style="margin-left: 0.75rem; color: ${trade.direction === 'long' ? '#4CAF50' : '#F44336'}; font-size: 0.875rem;">
                                ${trade.direction.toUpperCase()}
                            </span>
                        </div>
                        <span class="${pnlClass}" style="font-weight: 700; font-size: 1.125rem;">
                            ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}
                        </span>
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                        Entry: $${trade.entry_price} | Exit: ${trade.exit_price ? '$' + trade.exit_price : 'Open'} | ${time}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error in loadRecentActivity:', error);
    }
}

// Profile Modal
async function openProfileModal() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Prefer global summary for consistency across app
    let progressSummary = null;
    try {
        if (typeof getUserProgressSummary === 'function') {
            progressSummary = await getUserProgressSummary(user.id);
        }
    } catch (e) {
        console.warn('getUserProgressSummary failed, falling back to raw query', e);
    }
    
    let progress = null;
    if (!progressSummary) {
        // Pick the row with the highest XP in case of duplicates/nulls
        const { data: allProgressRows } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id);
        if (Array.isArray(allProgressRows) && allProgressRows.length > 0) {
            progress = allProgressRows.reduce((best, row) => {
                const currXP = Number(row?.experience ?? row?.xp ?? row?.total_xp ?? 0);
                const bestXP = Number(best?.experience ?? best?.xp ?? best?.total_xp ?? 0);
                return currXP > bestXP ? row : best;
            }, allProgressRows[0]);
        }
    }

    // Derive level from XP to avoid stale DB level mismatch
    // Prefer summary values
    let xp = Number(progressSummary?.experience ?? progress?.experience ?? progress?.xp ?? progress?.total_xp ?? 0);
    let derived = null;
    // Inline fallback identical to progress.js
    function _calcLevelFromXP_local(val) {
        let level = 1;
        let totalXPNeeded = 0;
        let nextLevelXP = 100;
        while (val >= totalXPNeeded + nextLevelXP) {
            totalXPNeeded += nextLevelXP;
            level++;
            nextLevelXP = Math.floor(100 * Math.pow(1.5, level - 1));
        }
        return { level, nextLevelXP };
    }
    try {
        if (typeof calculateLevelFromXP === 'function') {
            derived = calculateLevelFromXP(xp);
        } else {
            derived = _calcLevelFromXP_local(xp);
        }
    } catch (_) {
        derived = _calcLevelFromXP_local(xp);
    }
    let displayLevel = (derived?.level ?? progressSummary?.level ?? progress?.level ?? 1);
    let currentLevelXP = (derived?.currentLevelXP ?? null);
    let nextLevelXP = (derived?.nextLevelXP ?? progressSummary?.next_level_xp ?? null);

    // Fallback: if XP is 0 but header widget shows values, parse them
    try {
        if ((!xp || xp === 0) && document.getElementById('headerXpProgress')) {
            const txt = document.getElementById('headerXpProgress').textContent || '';
            const m = txt.match(/(\d+)\s*\/\s*(\d+)/);
            if (m) {
                currentLevelXP = Number(m[1]);
                nextLevelXP = Number(m[2]);
                // If level element exists, use it
                const hdrLvl = document.getElementById('headerCurrentLevel');
                if (hdrLvl) displayLevel = Number(hdrLvl.textContent) || displayLevel;
                // Reconstruct total XP = sum of previous levels caps + currentLevelXP
                try {
                    let totalNeeded = 0; let lv = 1; let nxt = 100;
                    while (lv < displayLevel) {
                        totalNeeded += nxt; lv++; nxt = Math.floor(100 * Math.pow(1.5, lv - 1));
                    }
                    xp = totalNeeded + (currentLevelXP || 0);
                } catch(_) { /* ignore */ }
            }
        }
    } catch (_) { /* ignore */ }
    
    // Fetch avatar from onboarding (emoji fallback) and user_profiles (photo url or emoji)
    let avatarEmoji = '👤'; // default
    let avatarUrl = null;
    let isLegendary = false;
    try {
        const { data: onboardingData, error } = await supabase
            .from('user_onboarding')
            .select('avatar')
            .eq('user_id', user.id)
            .single();
        if (!error && onboardingData?.avatar) {
            avatarEmoji = onboardingData.avatar;
        }
    } catch (_) { /* ignore */ }
    try {
        const { data: profileAvatar } = await supabase
            .from('user_profiles')
            .select('avatar, avatar_url, is_legendary')
            .eq('user_id', user.id)
            .single();
        // Prefer explicit avatar_url if present
        if (profileAvatar?.avatar_url) {
            avatarUrl = profileAvatar.avatar_url;
        } else if (profileAvatar?.avatar) {
            // Backward compatibility: avatar column may contain emoji OR url
            if (typeof profileAvatar.avatar === 'string' && profileAvatar.avatar.startsWith('http')) {
                avatarUrl = profileAvatar.avatar;
            } else {
                avatarEmoji = profileAvatar.avatar;
            }
        }
        isLegendary = !!profileAvatar?.is_legendary;
    } catch (_) { /* ignore */ }
    
    // Fetch premium status for inline badge
    let isPremium = false;
    try {
        const { data: profileRow } = await supabase
            .from('user_profiles')
            .select('is_premium')
            .eq('user_id', user.id)
            .single();
        isPremium = !!profileRow?.is_premium;
    } catch (e) {
        // non-fatal
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    const avatarBlock = avatarUrl
        ? `<img src="${avatarUrl}" alt="avatar" style="width:120px;height:120px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 1rem;">`
        : `<div style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), #FFB84D); margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 4rem;">${avatarEmoji}</div>`;
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close-button" onclick="this.closest('.modal').remove()">&times;</span>
            <h2 style="margin-bottom: 2rem; text-align: center;">👤 Your Profile</h2>
            
            <div style="text-align: center; margin-bottom: 2rem;">
                ${avatarBlock}
                <h3 style="margin: 0.5rem 0; display: inline-flex; align-items: center; gap: 0.35rem;"><span class="${isLegendary ? 'legendary-name' : ''}">${user.user_metadata?.full_name || 'Trader'}</span>
                    ${isPremium ? `<span title="PREMIUM" style="color: #FFD54F;">💎</span>` : ''}
                </h3>
                <p style="color: var(--text-secondary); font-size: 0.875rem;">${user.email}</p>
            </div>
            
            <div style="background: rgba(255, 149, 0, 0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: center;">
                    <div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${displayLevel}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Level</div>
                    </div>
                    <div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${Number.isFinite(xp) && xp > 0 ? xp : (currentLevelXP ?? 0)}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${Number.isFinite(xp) && xp > 0 ? 'Total XP' : 'Current XP'}</div>
                        ${currentLevelXP != null && nextLevelXP != null ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">${currentLevelXP} / ${nextLevelXP} this level</div>` : ''}
                    </div>
                    <div>
                        <div style="font-size: 2rem; font-weight: 700; color: #4CAF50;">${progress?.beers_cracked || 0}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Glasses Cracked</div>
                    </div>
                    <div>
                        <div style="font-size: 2rem; font-weight: 700; color: #F44336;">${progress?.beers_spilled || 0}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Glasses Spilled</div>
                    </div>
                </div>
            </div>
            
            <button class="cta-primary-large" onclick="this.closest('.modal').remove()">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Leaderboard Modal
async function openLeaderboardModal() {
    const { data: leaderboard, error } = await supabase
        .from('user_progress')
        .select('user_id, level, total_check_ins, beers_cracked, streak')
        .order('total_check_ins', { ascending: false })
        .limit(10);
    
    if (error) {
        console.error('Error loading leaderboard:', error);
        return;
    }
    
    // Fetch user metadata for each user
    const usersPromises = leaderboard.map(async (entry) => {
        const { data: userData } = await supabase.auth.admin.getUserById(entry.user_id);
        return {
            ...entry,
            userName: userData?.user?.user_metadata?.full_name || userData?.user?.email?.split('@')[0] || 'Trader'
        };
    });
    
    const usersWithNames = await Promise.all(usersPromises);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close-button" onclick="this.closest('.modal').remove()">&times;</span>
            <h2 style="margin-bottom: 2rem; text-align: center;">🏆 Leaderboard</h2>
            
            <div style="max-height: 500px; overflow-y: auto;">
                ${usersWithNames.map((user, index) => `
                    <div style="background: ${index < 3 ? 'rgba(255, 149, 0, 0.1)' : 'var(--card-bg)'}; border: 1px solid var(--glass-border); border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 1rem;">
                        <div style="font-size: 1.5rem; font-weight: 700; width: 40px; text-align: center; color: ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--text-secondary)'};">
                            ${index + 1}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">${user.userName}</div>
                            <div style="font-size: 0.875rem; color: var(--text-secondary);">
                                Level ${user.level} | ${user.beers_cracked} Glasses | ${user.streak} Day Streak
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary);">${user.total_check_ins}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">XP</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <button class="cta-primary-large" onclick="this.closest('.modal').remove()" style="margin-top: 1rem;">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Settings Modal
async function openSettingsModal() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close-button" onclick="this.closest('.modal').remove()">&times;</span>
            <h2 style="margin-bottom: 2rem;">⚙️ Settings</h2>
            
            <div style="margin-bottom: 2rem;">
                <h3 style="font-size: 1.125rem; margin-bottom: 1rem;">Account</h3>
                <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem;">
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Email</div>
                    <div style="font-weight: 600;">${user.email}</div>
                </div>
                <button class="cta-secondary" onclick="alert('Password change coming soon!')" style="width: 100%;">
                    🔒 Change Password
                </button>
            </div>
            
            <div style="margin-bottom: 2rem;">
                <h3 style="font-size: 1.125rem; margin-bottom: 1rem;">Profile Photo</h3>
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div id="settingsAvatarPreview" style="width:64px; height:64px; border-radius:50%; overflow:hidden; background: linear-gradient(135deg, var(--primary), #FFB84D); display:flex; align-items:center; justify-content:center; font-size:2rem;">👤</div>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="cta-primary" id="uploadAvatarBtn" onclick="selectAndUploadAvatar()">Upload Photo</button>
                        <button class="cta-secondary" id="removeAvatarBtn" onclick="removeAvatar()">Remove</button>
                    </div>
                </div>
                <div id="presetAvatarRow" style="margin-top: 0.75rem;">
                    <div style="font-size:0.9rem; color: var(--text-secondary); margin-bottom: 0.4rem;">Or choose a preset:</div>
                    <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                        <div style="width:56px; height:56px; border-radius:50%; overflow:hidden; border:1px solid var(--glass-border);">
                            <img src="assets/avatars/male.png" alt="Male" style="width:100%; height:100%; object-fit:cover;">
                        </div>
                        <button class="cta-secondary" onclick="applyPresetAvatar('assets/avatars/male.png')">Use Male</button>
                        <div style="width:56px; height:56px; border-radius:50%; overflow:hidden; border:1px solid var(--glass-border);">
                            <img src="assets/avatars/female.png" alt="Female" style="width:100%; height:100%; object-fit:cover;">
                        </div>
                        <button class="cta-secondary" onclick="applyPresetAvatar('assets/avatars/female.png')">Use Female</button>
                    </div>
                </div>
                <div id="premiumPhotoNote" style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.5rem;"></div>
            </div>
            
            <div style="margin-bottom: 2rem;">
                <h3 style="font-size: 1.125rem; margin-bottom: 1rem;">Premium</h3>
                <div id="premiumStatusLine" style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 0.75rem; margin-bottom: 0.75rem;">
                    Status: <strong id="premiumStatusValue">Checking...</strong>
                </div>
                <ul style="margin:0 0 0.75rem 1rem; color: var(--text-secondary); font-size:0.9rem;">
                    <li>Access Premium Achievements & special rewards</li>
                    <li>Unlock default rule templates pack</li>
                    <li>Priority analytics refresh and upcoming pro insights</li>
                </ul>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <input id="premiumInviteCode" type="text" placeholder="Enter invite code" style="flex:1; background: var(--card-bg); color: var(--text-primary); border:1px solid var(--glass-border); border-radius:8px; padding:0.6rem;"/>
                    <button class="cta-primary" onclick="applyPremiumCode()">Apply Code</button>
                </div>
                <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.5rem;">No code? Ask an admin to grant premium to your email.</div>
                <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
                    <button class="cta-primary" onclick="startPremiumCheckout()">Upgrade to Premium</button>
                    <button class="cta-secondary" onclick="openBillingPortal()">Manage Billing</button>
                </div>
            </div>
            
            <div style="margin-bottom: 2rem;">
                <h3 style="font-size: 1.125rem; margin-bottom: 1rem;">Notifications</h3>
                <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1rem;">
                    <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                        <span>Browser Notifications</span>
                        <input type="checkbox" checked onchange="toggleNotificationSettings(this.checked)" style="width: 20px; height: 20px; cursor: pointer;">
                    </label>
                </div>
            </div>
            
            <div style="margin-bottom: 2rem;">
                <h3 style="font-size: 1.125rem; margin-bottom: 1rem;">Danger Zone</h3>
                <button class="cta-secondary" onclick="resetAccountOneTime()" style="width: 100%; background: rgba(255, 235, 59, 0.12); border-color: #FFC107; color: #FFC107; margin-bottom:0.5rem;">
                    ♻️ Reset Account (one-time)
                </button>
                <div id="resetNote" style="font-size:0.8rem; color: var(--text-secondary); margin-bottom:0.75rem;">You can reset once. This clears trades, rules, achievements, stars, and progress. Friends and login remain.</div>
                <button class="cta-secondary" onclick="deleteAccount()" style="width: 100%; background: rgba(244, 67, 54, 0.2); border-color: #F44336; color: #F44336;">
                    🗑️ Delete Account
                </button>
            </div>
            
            <button class="cta-primary-large" onclick="this.closest('.modal').remove()">Close</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Populate premium/reset status and avatar preview
    try {
        const { data: prof } = await supabase
            .from('user_profiles')
            .select('is_premium, reset_used, avatar_url, created_at')
            .eq('user_id', user.id)
            .single();
        let isPremium = !!prof?.is_premium;
        // 7-day free trial based on profile created_at
        let trialDaysLeft = 0;
        try {
            const createdAt = prof?.created_at ? new Date(prof.created_at) : null;
            if (createdAt) {
                const ms = Date.now() - createdAt.getTime();
                const daysElapsed = Math.floor(ms / 86400000);
                trialDaysLeft = Math.max(0, 7 - daysElapsed);
            }
        } catch (_) { /* ignore */ }
        const isTrial = trialDaysLeft > 0;
        if (!isPremium) {
            try {
                const { data: lb } = await supabase
                    .from('leaderboard_stats')
                    .select('is_premium')
                    .eq('user_id', user.id)
                    .single();
                isPremium = !!lb?.is_premium || isPremium;
            } catch(_) {}
        }
        if (!isPremium && localStorage.getItem('lockin_premium_local') === '1') {
            isPremium = true;
        }
        const resetUsed = !!prof?.reset_used || localStorage.getItem('lockin_reset_used') === '1';
        const statusEl = document.getElementById('premiumStatusValue');
        if (statusEl) statusEl.textContent = isPremium ? 'Premium' : (isTrial ? `Trial (${trialDaysLeft} days left)` : 'Free');
        const codeInput = document.getElementById('premiumInviteCode');
        if (codeInput && isPremium) {
            codeInput.disabled = true;
            codeInput.placeholder = 'Already Premium';
        }
        const resetNote = document.getElementById('resetNote');
        if (resetNote && resetUsed) resetNote.textContent = 'Reset already used.';
        // Avatar preview
        const preview = document.getElementById('settingsAvatarPreview');
        if (preview) {
            if (prof?.avatar_url) {
                preview.innerHTML = `<img src="${prof.avatar_url}" alt="avatar" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                preview.textContent = '👤';
            }
        }
        // Expose global premium/trial state
        window.lockinPremium = { isPremium, isTrial, isPremiumOrTrial: (isPremium || isTrial), trialDaysLeft };
        // Gate upload for non-premium
        const uploadBtn = document.getElementById('uploadAvatarBtn');
        const note = document.getElementById('premiumPhotoNote');
        if (uploadBtn && !isPremium && !isTrial) {
            uploadBtn.disabled = true;
            if (note) note.textContent = 'Uploading a profile photo is a Premium feature. Start Premium to enable this.';
        } else {
            if (uploadBtn) uploadBtn.disabled = false;
            if (note) note.textContent = isPremium ? '' : `Trial active — ${trialDaysLeft} day(s) left`;
        }
    } catch (_) { /* ignore */ }
}

function toggleNotificationSettings(enabled) {
    if (enabled) {
        requestNotificationPermission();
    } else {
        console.log('Notifications disabled in settings');
    }
}

// Apply Premium via invite code (dev/beta flow)
async function applyPremiumCode() {
    try {
        const code = document.getElementById('premiumInviteCode')?.value?.trim();
        if (!code) return alert('Enter an invite code');
        const validCodes = ['LOCKIN-BETA', 'PREMIUM-2025', 'NATHAN-PREMIUM'];
        if (!validCodes.includes(code)) return alert('Invalid code');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase
            .from('user_profiles')
            .update({ is_premium: true })
            .eq('user_id', user.id);
        if (error) {
            console.warn('applyPremiumCode failed on user_profiles, falling back to local flag', error);
            // Fallback marker
            localStorage.setItem('lockin_premium_local', '1');
        }
        alert('✅ Premium activated!');
        document.querySelector('#premiumStatusValue').textContent = 'Premium';
        const input = document.getElementById('premiumInviteCode');
        if (input) { input.disabled = true; input.placeholder = 'Already Premium'; }
    } catch (e) {
        alert('Failed to apply code');
    }
}

// One-time Reset Account
async function resetAccountOneTime() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Check allowance
        let resetUsed = false;
        try {
            const { data: prof } = await supabase
                .from('user_profiles')
                .select('reset_used')
                .eq('user_id', user.id)
                .single();
            resetUsed = !!prof?.reset_used;
        } catch (_) { /* ignore */ }
        if (resetUsed || localStorage.getItem('lockin_reset_used') === '1') {
            return alert('You have already used your one-time reset.');
        }
        if (!confirm('This will permanently clear your trades, rules, achievements, stars, and progress. Continue?')) return;

        // Clear data (comprehensive reset)
        const ops = [];
        ops.push(supabase.from('trades').delete().eq('user_id', user.id));
        ops.push(supabase.from('rule_violations').delete().eq('user_id', user.id));
        ops.push(supabase.from('trading_rules').delete().eq('user_id', user.id));
        ops.push(supabase.from('user_defined_rules').delete().eq('user_id', user.id));
        ops.push(supabase.from('user_achievements').delete().eq('user_id', user.id));
        ops.push(supabase.from('user_stars').delete().eq('user_id', user.id));
        ops.push(supabase.from('user_progress').delete().eq('user_id', user.id));
        ops.push(supabase.from('user_goals').delete().eq('user_id', user.id));
        ops.push(supabase.from('beer_completions').delete().eq('user_id', user.id));
        ops.push(supabase.from('beer_spills').delete().eq('user_id', user.id));
        ops.push(supabase.from('daily_stats').delete().eq('user_id', user.id));
        ops.push(supabase.from('daily_check_ins').delete().eq('user_id', user.id));
        ops.push(supabase.from('share_history').delete().eq('user_id', user.id));
        ops.push(supabase.from('leaderboard_stats').delete().eq('user_id', user.id));
        ops.push(supabase.from('notifications').delete().eq('user_id', user.id));
        ops.push(supabase.from('user_customization').delete().eq('user_id', user.id));
        ops.push(supabase.from('user_onboarding').delete().eq('user_id', user.id));
        // Reset AI usage quotas as well
        ops.push(supabase.from('ai_usage').delete().eq('user_id', user.id));
        await Promise.allSettled(ops);

        // Ensure onboarding restarts (upsert to guarantee a row exists) and mark reset_used
        try {
            await supabase.from('user_profiles').upsert({
                user_id: user.id,
                onboarding_completed: false,
                reset_used: true
            }, { onConflict: 'user_id', ignoreDuplicates: false });
        } catch (_) { /* ignore */ }
        
        // Clear app cached data but PRESERVE Supabase auth token (keys prefixed with 'sb-')
        try { sessionStorage.clear(); } catch (_) {}
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;
                // Keep Supabase session tokens (sb-...-auth-token)
                if (k.startsWith('sb-')) continue;
                keys.push(k);
            }
            keys.forEach(k => localStorage.removeItem(k));
        } catch (_) { /* ignore */ }
        localStorage.setItem('lockin_reset_used', '1');
        
        // Clear any global state
        if (typeof window.currentProgressData !== 'undefined') window.currentProgressData = null;
        if (typeof window.userProgress !== 'undefined') window.userProgress = null;

        alert('✅ Account reset complete. Please sign in to start onboarding.');
        // Sign out and send user to login; after sign-in, auth.js routes to onboarding
        try { await supabase.auth.signOut(); } catch (_) {}
        window.location.replace('login.html');
    } catch (e) {
        console.error('resetAccountOneTime failed', e);
        alert('Failed to reset account.');
    }
}

// Export functions
window.loadRecentActivity = loadRecentActivity;
window.openProfileModal = openProfileModal;
window.openLeaderboardModal = openLeaderboardModal;
window.openSettingsModal = openSettingsModal;
window.applyPremiumCode = applyPremiumCode;
window.resetAccountOneTime = resetAccountOneTime;
window.deleteAccount = deleteAccount;
window.openDailyFlow = openDailyFlow;

// Open any user's profile by id (shared for Achievements/Friends)
async function openUserProfileById(userId) {
    try {
        const { data: { user: me } } = await supabase.auth.getUser();
        if (!me) return;

        const { data: row } = await supabase
            .from('leaderboard_stats')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (!row) return;

        // Determine follow state
        let isFollowing = false;
        try {
            const { data: followRec } = await supabase
                .from('follows')
                .select('id')
                .eq('follower_id', me.id)
                .eq('following_id', userId)
                .limit(1)
                .single();
            isFollowing = !!followRec;
        } catch (_) { /* not following */ }

        const badge = row.is_premium ? '<span title="PREMIUM" style="color:#FFD54F; margin-left:0.25rem;">💎</span>' : '';

        // Fetch avatar/photo and username (public profile info)
        let avatarEmoji = '👤';
        let avatarUrl = null;
        let profileUsername = null;
        let isLegendary = false;
        try {
            const { data: prof } = await supabase
                .from('user_profiles')
                .select('username, avatar, avatar_url, is_legendary')
                .eq('user_id', userId)
                .single();
            if (prof) {
                profileUsername = (prof.username && prof.username.trim()) ? prof.username : null;
                isLegendary = !!prof.is_legendary;
                if (prof.avatar_url) {
                    avatarUrl = prof.avatar_url;
                } else if (prof.avatar) {
                    if (typeof prof.avatar === 'string' && prof.avatar.startsWith('http')) {
                        avatarUrl = prof.avatar;
                    } else {
                        avatarEmoji = prof.avatar;
                    }
                }
            }
        } catch (_) { /* ignore */ }
        const avatarBlock = avatarUrl
            ? `<img src="${avatarUrl}" alt="avatar" style="width:96px;height:96px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 0.5rem;">`
            : `<div style="width:96px;height:96px;border-radius:50%;background: linear-gradient(135deg, var(--primary), #FFB84D); display:flex;align-items:center;justify-content:center;font-size:2.25rem;margin:0 auto 0.5rem;">${avatarEmoji}</div>`;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        const displayName = (row.full_name && row.full_name.trim())
            ? row.full_name
            : (profileUsername && profileUsername.trim())
                ? profileUsername
                : (row.email ? (row.email.split('@')[0]) : 'Trader');
        const displayNameHtml = isLegendary ? `<span class="legendary-name">${displayName}</span>` : displayName;

        modal.innerHTML = `
            <div class="modal-content" style="max-width:520px; position: relative;">
                <span class="close-button" onclick="this.closest('.modal').remove()">&times;</span>
                <div style="text-align:center;">${avatarBlock}</div>
                <div style="display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-bottom:0.75rem;">
                    <h2 style="margin:0; text-align:center;">${displayNameHtml} ${badge}</h2>
                    <button id="followIconBtn_${row.user_id}"
                        title="${isFollowing ? 'Unfollow' : 'Follow'}"
                        style="all:unset; cursor:pointer; background: rgba(255,255,255,0.08); border:1px solid var(--glass-border); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1rem;">
                        ${isFollowing ? '✓' : '+'}
                    </button>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                    <div style="background: rgba(255,255,255,0.05); padding:1rem; border-radius:12px; text-align:center;">
                        <div style="font-size:1.75rem; font-weight:800; color:var(--primary);">${row.level}</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary);">Level</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding:1rem; border-radius:12px; text-align:center;">
                        <div style="font-size:1.75rem; font-weight:800;">${row.completions}</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary);">Completions</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding:1rem; border-radius:12px; text-align:center; grid-column: span 2;">
                        <div style="font-size:1.25rem; font-weight:700;">${row.discipline_score}%</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary);">Discipline</div>
                    </div>
                </div>

                <!-- Advanced Stats -->
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem; margin-top:1rem;">
                    <div style="background: rgba(255,255,255,0.05); padding:1rem; border-radius:12px; text-align:center;">
                        <div id="profileGrowth_${row.user_id}" style="font-size:1.25rem; font-weight:700;">—</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary);">Growth %</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding:1rem; border-radius:12px; text-align:center;">
                        <div id="profileRMultiple_${row.user_id}" style="font-size:1.25rem; font-weight:700;">—</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary);">R Multiple</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding:1rem; border-radius:12px; text-align:center;">
                        <div id="profileProfitFactor_${row.user_id}" style="font-size:1.25rem; font-weight:700;">—</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary);">Profit Factor</div>
                    </div>
                </div>

                <div style="display:flex; gap:0.5rem; justify-content:center; margin-top:1rem; flex-wrap:wrap;">
                    <button class="cta-secondary" onclick="this.closest('.modal').remove()">Close</button>
                    <button class="cta-primary" onclick="window.location.href='journal.html?user=${row.user_id}'" title="View ${displayName}'s trade journal (may require following)">View Journal</button>
                    <button class="cta-primary" id="followActionBtn_${row.user_id}" onclick="toggleFollow('${row.user_id}')">${isFollowing ? 'Unfollow' : 'Follow'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Wire follow icon toggle and keep bottom button in sync
        const iconBtn = document.getElementById(`followIconBtn_${row.user_id}`);
        const actionBtn = document.getElementById(`followActionBtn_${row.user_id}`);
        if (iconBtn) {
            iconBtn.addEventListener('click', async () => {
                await toggleFollow(row.user_id);
                isFollowing = !isFollowing;
                iconBtn.textContent = isFollowing ? '✓' : '+';
                iconBtn.title = isFollowing ? 'Unfollow' : 'Follow';
                if (actionBtn) actionBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';
                // Try loading stats again if now following
                try { await _loadProfileAdvancedStats(userId, me.id === userId || isFollowing); } catch (_) {}
            });
        }

        // Load advanced stats (if self or following)
        await _loadProfileAdvancedStats(userId, me.id === userId || isFollowing);

    } catch (e) { console.warn('openUserProfileById failed', e); }
}
window.openUserProfileById = openUserProfileById;

// Helper to compute and render advanced stats
async function _loadProfileAdvancedStats(targetUserId, canView) {
    try {
        const growthEl = document.getElementById(`profileGrowth_${targetUserId}`);
        const rEl = document.getElementById(`profileRMultiple_${targetUserId}`);
        const pfEl = document.getElementById(`profileProfitFactor_${targetUserId}`);
        if (!growthEl || !rEl || !pfEl) return;

        // Default placeholders
        growthEl.textContent = '—';
        rEl.textContent = '—';
        pfEl.textContent = '—';

        // Only proceed if allowed
        if (!canView) {
            return; // Cannot read other user's trades/goals unless following (RLS)
        }

        // Fetch closed trades for stats
        const { data: trades, error: tErr } = await supabase
            .from('trades')
            .select('entry_price, exit_price, position_size, trade_type, direction, status')
            .eq('user_id', targetUserId)
            .eq('status', 'closed')
            .limit(1000);
        if (tErr) { return; }

        let totalWins = 0, totalLosses = 0, winCount = 0, lossCount = 0;
        (trades || []).forEach(t => {
            if (t.exit_price == null || t.entry_price == null) return;
            const isOption = t.trade_type === 'call' || t.trade_type === 'put';
            const mult = isOption ? 100 : 1;
            const dir = (t.direction || '').toLowerCase() === 'short' ? -1 : 1;
            const pnl = (t.exit_price - t.entry_price) * (t.position_size || 0) * mult * dir;
            if (pnl > 0) { totalWins += pnl; winCount++; }
            else if (pnl < 0) { totalLosses += Math.abs(pnl); lossCount++; }
        });

        // Profit Factor
        if (totalWins > 0 && totalLosses > 0) {
            pfEl.textContent = (totalWins / totalLosses).toFixed(2);
        } else if (totalWins > 0 && totalLosses === 0) {
            pfEl.textContent = '∞';
        }

        // R Multiple (avg win / avg loss)
        const avgWin = winCount > 0 ? (totalWins / winCount) : 0;
        const avgLoss = lossCount > 0 ? (totalLosses / lossCount) : 0;
        if (avgWin > 0 && avgLoss > 0) {
            rEl.textContent = (avgWin / avgLoss).toFixed(2);
        }

        // Growth % (only for self, using goals baseline)
        const { data: { user: me } } = await supabase.auth.getUser();
        const isSelf = me && me.id === targetUserId;
        if (isSelf) {
            try {
                const { data: goal } = await supabase
                    .from('user_goals')
                    .select('starting_capital, current_capital')
                    .eq('user_id', targetUserId)
                    .eq('is_active', true)
                    .single();
                if (goal && Number(goal.starting_capital) > 0 && goal.current_capital != null) {
                    const growth = ((Number(goal.current_capital) - Number(goal.starting_capital)) / Number(goal.starting_capital)) * 100;
                    growthEl.textContent = `${growth.toFixed(1)}%`;
                }
            } catch (_) { /* keep placeholder */ }
        }
    } catch (_) { /* ignore */ }
}

// Avatar upload/remove (Premium)
async function selectAndUploadAvatar() {
    try {
        // Create picker immediately to maintain user gesture
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp';
        input.onchange = async (e) => {
            try {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { alert('Please log in'); return; }
                // Verify premium with multiple sources
                let isPremium = false;
                try {
                    const { data: prof } = await supabase.from('user_profiles').select('is_premium').eq('user_id', user.id).single();
                    isPremium = !!prof?.is_premium;
                } catch(_) {}
                if (!isPremium) {
                    try {
                        const { data: lb } = await supabase.from('leaderboard_stats').select('is_premium').eq('user_id', user.id).single();
                        isPremium = !!lb?.is_premium;
                    } catch(_) {}
                }
                if (!isPremium && localStorage.getItem('lockin_premium_local') === '1') isPremium = true;
                if (!isPremium) { alert('Profile photos are a Premium feature.'); return; }

                if (file.size > 2 * 1024 * 1024) { alert('Max size is 2MB.'); return; }
                const { name, type } = file;
                // Sanitize filename: remove spaces and non-ASCII/special chars
                const safeName = name
                    .normalize('NFKD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9._-]/g, '-')
                    .replace(/-+/g, '-')
                    .slice(0, 120);
                const path = `${user.id}/${Date.now()}_${safeName}`;
                const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: type });
                if (upErr) { console.error('Supabase storage upload error:', upErr); alert('Upload failed. Ensure the "avatars" bucket exists and is public.'); return; }
                const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
                const publicUrl = pub?.publicUrl;
                if (!publicUrl) { alert('Could not get public URL.'); return; }
                await supabase.from('user_profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
                // Update UI previews
                const preview = document.getElementById('settingsAvatarPreview');
                if (preview) preview.innerHTML = `<img src="${publicUrl}" alt="avatar" style="width:100%; height:100%; object-fit:cover; object-position:center;">`;
                const dash = document.getElementById('dashboardAvatar');
                if (dash) dash.innerHTML = `<img src="${publicUrl}" alt="avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover; object-position:center;">`;
            } catch (err) {
                console.error('Avatar upload failed', err);
                alert('Upload failed.');
            }
        };
        // Fire picker synchronously
        input.click();
    } catch (e) {
        console.error('selectAndUploadAvatar failed', e);
        alert('Upload failed.');
    }
}

async function removeAvatar() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('user_profiles').update({ avatar_url: null }).eq('user_id', user.id);
        const preview = document.getElementById('settingsAvatarPreview');
        if (preview) preview.textContent = '👤';
        const dashAvatar = document.getElementById('dashboardAvatar');
        if (dashAvatar) dashAvatar.textContent = '👤';
        alert('Profile photo removed');
    } catch (e) {
        console.error('removeAvatar failed', e);
    }
}
window.selectAndUploadAvatar = selectAndUploadAvatar;
window.removeAvatar = removeAvatar;

// Apply a preset avatar (uses a local static asset path)
async function applyPresetAvatar(url) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert('Please log in'); return; }
        await supabase.from('user_profiles').update({ avatar_url: url }).eq('user_id', user.id);
        const preview = document.getElementById('settingsAvatarPreview');
        if (preview) preview.innerHTML = `<img src="${url}" alt="avatar" style="width:100%; height:100%; object-fit:cover; object-position:center;">`;
        const dash = document.getElementById('dashboardAvatar');
        if (dash) dash.innerHTML = `<img src="${url}" alt="avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover; object-position:center;">`;
        alert('Preset avatar applied');
    } catch (e) {
        console.error('applyPresetAvatar failed', e);
        alert('Failed to apply preset.');
    }
}
window.applyPresetAvatar = applyPresetAvatar;

// Toggle follow/unfollow (global)
async function toggleFollow(otherUserId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return alert('Please log in');
        if (user.id === otherUserId) return alert("That's you!");
        
        // Check if already following
        const { data: existing } = await supabase
            .from('follows')
            .select('id')
            .match({ follower_id: user.id, following_id: otherUserId })
            .single();
        
        if (existing) {
            // Unfollow
            const { error } = await supabase
                .from('follows')
                .delete()
                .match({ follower_id: user.id, following_id: otherUserId });
            if (error) {
                console.warn('toggleFollow unfollow error', error);
                alert('Could not unfollow.');
            } else {
                alert('Unfollowed!');
                const btn = document.getElementById(`followActionBtn_${otherUserId}`);
                if (btn) btn.textContent = 'Follow';
            }
        } else {
            // Follow
            const { error } = await supabase
                .from('follows')
                .insert({ follower_id: user.id, following_id: otherUserId });
            if (error) {
                console.warn('toggleFollow follow error', error);
                alert('Could not follow.');
            } else {
                alert('Now following!');
                const btn = document.getElementById(`followActionBtn_${otherUserId}`);
                if (btn) btn.textContent = 'Unfollow';
            }
        }
    } catch (e) {
        console.error('toggleFollow failed', e);
        alert('Error');
    }
}
window.toggleFollow = toggleFollow;
