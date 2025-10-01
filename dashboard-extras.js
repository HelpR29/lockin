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
    
    // Fetch avatar from onboarding (with error handling)
    let avatarEmoji = '👤'; // default
    try {
        const { data: onboardingData, error } = await supabase
            .from('user_onboarding')
            .select('avatar')
            .eq('user_id', user.id)
            .single();
        
        if (!error && onboardingData?.avatar) {
            avatarEmoji = onboardingData.avatar;
        }
    } catch (err) {
        console.log('No onboarding data, using default avatar');
    }
    
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
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close-button" onclick="this.closest('.modal').remove()">&times;</span>
            <h2 style="margin-bottom: 2rem; text-align: center;">👤 Your Profile</h2>
            
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), #FFB84D); margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 4rem;">
                    ${avatarEmoji}
                </div>
                <h3 style="margin: 0.5rem 0; display: inline-flex; align-items: center; gap: 0.35rem;">${user.user_metadata?.full_name || 'Trader'}
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
                <button class="cta-secondary" onclick="if(confirm('Are you sure?')) alert('Account deletion coming soon!')" style="width: 100%; background: rgba(244, 67, 54, 0.2); border-color: #F44336; color: #F44336;">
                    🗑️ Delete Account
                </button>
            </div>
            
            <button class="cta-primary-large" onclick="this.closest('.modal').remove()">Close</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Populate premium/reset status
    try {
        const { data: prof } = await supabase
            .from('user_profiles')
            .select('is_premium, reset_used')
            .eq('user_id', user.id)
            .single();
        const isPremium = !!prof?.is_premium;
        const resetUsed = !!prof?.reset_used || localStorage.getItem('lockin_reset_used') === '1';
        const statusEl = document.getElementById('premiumStatusValue');
        if (statusEl) statusEl.textContent = isPremium ? 'Premium' : 'Free';
        const codeInput = document.getElementById('premiumInviteCode');
        if (codeInput && isPremium) {
            codeInput.disabled = true;
            codeInput.placeholder = 'Already Premium';
        }
        const resetNote = document.getElementById('resetNote');
        if (resetNote && resetUsed) resetNote.textContent = 'Reset already used.';
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

        // Clear data
        const ops = [];
        ops.push(supabase.from('trades').delete().eq('user_id', user.id));
        ops.push(supabase.from('rule_violations').delete().eq('user_id', user.id));
        ops.push(supabase.from('trading_rules').delete().eq('user_id', user.id));
        ops.push(supabase.from('user_achievements').delete().eq('user_id', user.id));
        ops.push(supabase.from('user_stars').delete().eq('user_id', user.id));
        ops.push(supabase.from('user_progress').delete().eq('user_id', user.id));
        await Promise.allSettled(ops);

        // Mark used (best-effort)
        try {
            await supabase.from('user_profiles').update({ reset_used: true }).eq('user_id', user.id);
        } catch (_) { /* ignore */ }
        localStorage.setItem('lockin_reset_used', '1');

        alert('✅ Account reset complete. The page will reload.');
        window.location.reload();
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
