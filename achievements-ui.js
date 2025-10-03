// Achievements UI - Rendering and interactions

let currentTab = 'achievements';
let SELF_USER = { id: null, isPremium: false };

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🧩 achievements-ui loaded');
    await loadStarBalance();
    await loadAchievements();
    await loadRewardShop();
    await loadLeaderboard();
});

// Tab Switching
function switchTab(tab) {
    currentTab = tab;
    // Update buttons without relying on event
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    const btnForTab = document.querySelector(`button[onclick="switchTab('${tab}')"]`);
    if (btnForTab) btnForTab.classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const tabEl = document.getElementById(`tab-${tab}`);
    if (tabEl) tabEl.classList.add('active');

    if (tab === 'leaderboard') {
        // refresh leaderboard when switching in
        loadLeaderboard();
    }
}

// Load Star Balance
async function loadStarBalance() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: stars } = await supabase
            .from('user_stars')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const available = stars?.available_stars || 0;
        document.getElementById('starBalance').textContent = `⭐ ${available}`;
    } catch (error) {
        console.error('Error loading stars:', error);
    }
}

// Load Achievements
async function loadAchievements() {
    try {
        // Skeletons for achievements grids
        const freeGrid = document.getElementById('freeAchievementsGrid');
        const premiumGrid = document.getElementById('premiumAchievementsGrid');
        const skeletonCard = () => `
            <div class="achievement-card" style="opacity:0.7;">
                <div class="achievement-icon">⭐</div>
                <div class="achievement-name" style="height:1rem; background: rgba(255,255,255,0.06); border-radius:6px;"></div>
                <div class="achievement-description" style="height:1.5rem; background: rgba(255,255,255,0.04); border-radius:6px; margin-top:0.5rem;"></div>
                <div class="achievement-rewards" style="opacity:0.6;">
                    <span class="reward-badge">&nbsp;</span>
                </div>
            </div>`;
        if (freeGrid) freeGrid.innerHTML = Array.from({length: 4}).map(skeletonCard).join('');
        if (premiumGrid) premiumGrid.innerHTML = Array.from({length: 4}).map(skeletonCard).join('');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [achievementsRes, earnedRes] = await Promise.all([
            supabase.from('achievements').select('*').eq('is_active', true),
            supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id)
        ]);

        const achievements = achievementsRes.data || [];
        const earned = new Set(earnedRes.data?.map(a => a.achievement_id) || []);

        const freeAchievements = achievements.filter(a => a.category === 'free');
        const premiumAchievements = achievements.filter(a => a.category === 'premium');

        renderAchievementGrid('freeAchievementsGrid', freeAchievements, earned);
        renderAchievementGrid('premiumAchievementsGrid', premiumAchievements, earned);
    } catch (error) {
        console.error('Error loading achievements:', error);
    }
}

function renderAchievementGrid(containerId, achievements, earnedSet) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (achievements.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No achievements available.</p>';
        return;
    }

    container.innerHTML = achievements.map(ach => {
        const isEarned = earnedSet.has(ach.id);
        const cardClass = isEarned ? 'achievement-card earned' : 'achievement-card locked';
        
        return `
            <div class="${cardClass}">
                <div class="achievement-icon">${ach.icon}</div>
                <div class="achievement-name">${ach.name}</div>
                <div class="achievement-description">${ach.description}</div>
                ${isEarned ? '<div style="text-align: center; color: var(--primary); font-weight: 700;">✓ UNLOCKED</div>' : ''}
                <div class="achievement-rewards">
                    ${ach.star_reward > 0 ? `<span class="reward-badge">⭐ ${ach.star_reward}</span>` : ''}
                    ${ach.xp_reward > 0 ? `<span class="reward-badge">🎯 ${ach.xp_reward} XP</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Load Reward Shop
async function loadRewardShop() {
    try {
        // Skeletons for shop grid
        const shop = document.getElementById('shopGrid');
        if (shop) {
            shop.innerHTML = Array.from({length: 4}).map(() => `
                <div class="shop-item-card" style="opacity:0.7;">
                    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
                        <div style="font-size:3rem;">🛍️</div>
                        <div style="flex:1;">
                            <div style="height:1rem; background: rgba(255,255,255,0.06); border-radius:6px; margin-bottom:0.4rem;"></div>
                            <div style="height:1rem; background: rgba(255,255,255,0.04); border-radius:6px;"></div>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:1rem; border-top:1px solid var(--glass-border);">
                        <div style="width:60px; height:1.25rem; background: rgba(255,255,255,0.06); border-radius:6px;"></div>
                        <button class="cta-primary" disabled style="opacity:0.6;">Purchase</button>
                    </div>
                </div>
            `).join('');
        }
        const { data: rewards } = await supabase
            .from('reward_shop')
            .select('*')
            .eq('is_active', true)
            .order('cost_stars', { ascending: true });

        renderRewardShop(rewards || []);
    } catch (error) {
        console.error('Error loading reward shop:', error);
    }
}

function renderRewardShop(rewards) {
    const container = document.getElementById('shopGrid');
    if (!container) return;

    if (rewards.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No rewards available.</p>';
        return;
    }

    container.innerHTML = rewards.map(reward => `
        <div class="shop-item-card">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <div style="font-size: 3rem;">${reward.icon}</div>
                <div style="flex: 1;">
                    <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">
                        ${reward.name}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                        ${reward.description}
                    </div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid var(--glass-border);">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">
                    ⭐ ${reward.cost_stars}
                </div>
                <button class="cta-primary" onclick="purchaseReward('${reward.id}')" style="padding: 0.75rem 1.5rem;">
                    Purchase
                </button>
            </div>
        </div>
    `).join('');
}

// Purchase Reward
async function purchaseReward(rewardId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get reward details
        const { data: reward } = await supabase
            .from('reward_shop')
            .select('*')
            .eq('id', rewardId)
            .single();

        if (!reward) {
            alert('Reward not found!');
            return;
        }

        // Check star balance
        const { data: stars } = await supabase
            .from('user_stars')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const available = stars?.available_stars || 0;

        if (available < reward.cost_stars) {
            alert(`Not enough stars! You need ${reward.cost_stars} stars but only have ${available}.`);
            return;
        }

        if (!confirm(`Purchase "${reward.name}" for ⭐${reward.cost_stars} stars?`)) {
            return;
        }

        // Deduct stars
        await supabase
            .from('user_stars')
            .update({
                spent_stars: stars.spent_stars + reward.cost_stars,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        // Add to user rewards
        const expires = reward.reward_data?.duration_days 
            ? new Date(Date.now() + reward.reward_data.duration_days * 24 * 60 * 60 * 1000)
            : null;

        await supabase
            .from('user_rewards')
            .insert({
                user_id: user.id,
                reward_id: reward.id,
                expires_at: expires
            });

        alert(`✅ Successfully purchased "${reward.name}"!`);
        await loadStarBalance();
    } catch (error) {
        console.error('Error purchasing reward:', error);
        alert('Failed to purchase reward. Please try again.');
    }
}

// Load Leaderboard
async function loadLeaderboard() {
    try {
        // Skeleton loaders
        const podium = document.getElementById('podium');
        const table = document.getElementById('leaderboardTable');
        if (podium) {
            podium.innerHTML = `
                <div class="podium-place"><div class="podium-user"><div style="height: 110px; background: rgba(255,255,255,0.06); border-radius: 12px;"></div></div><div class="podium-base" style="height:140px; opacity:0.4;">&nbsp;</div></div>
                <div class="podium-place"><div class="podium-user"><div style="height: 140px; background: rgba(255,255,255,0.06); border-radius: 12px;"></div></div><div class="podium-base" style="height:180px; opacity:0.4;">&nbsp;</div></div>
                <div class="podium-place"><div class="podium-user"><div style="height: 90px; background: rgba(255,255,255,0.06); border-radius: 12px;"></div></div><div class="podium-base" style="height:100px; opacity:0.4;">&nbsp;</div></div>
            `;
        }
        if (table) {
            table.innerHTML = Array.from({length: 6}).map(() => `
                <div class="leaderboard-row">
                    <div style="width:40px; height:1rem; background: rgba(255,255,255,0.06); border-radius:6px;"></div>
                    <div style="height:1rem; background: rgba(255,255,255,0.06); border-radius:6px;"></div>
                    <div style="height:1rem; background: rgba(255,255,255,0.06); border-radius:6px;"></div>
                    <div style="height:1rem; background: rgba(255,255,255,0.06); border-radius:6px;"></div>
                    <div style="height:1rem; background: rgba(255,255,255,0.06); border-radius:6px;"></div>
                </div>
            `).join('');
        }
        const { data: leaderboard } = await supabase
            .from('leaderboard_stats')
            .select('*')
            .order('completions', { ascending: false })
            .order('discipline_score', { ascending: false})
            .limit(50);

        let rows = leaderboard || [];
        console.log('🏆 Leaderboard data with premium status (raw):', rows);

        // Fallback: if is_premium missing from view result, fetch from user_profiles
        if (rows.length && rows.every(r => r.is_premium == null)) {
            const ids = rows.map(r => r.user_id);
            const { data: profiles, error: profErr } = await supabase
                .from('user_profiles')
                .select('user_id, is_premium')
                .in('user_id', ids);
            if (!profErr && Array.isArray(profiles)) {
                const map = new Map(profiles.map(p => [p.user_id, !!p.is_premium]));
                rows = rows.map(r => ({ ...r, is_premium: map.get(r.user_id) || false }));
                console.log('🔁 Enriched leaderboard with user_profiles.is_premium');
            } else {
                console.warn('Could not enrich is_premium from user_profiles:', profErr);
            }
        }

        // Ensure current user's premium flag is correct
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                SELF_USER.id = user.id;
                const { data: me } = await supabase
                    .from('user_profiles')
                    .select('is_premium')
                    .eq('user_id', user.id)
                    .single();
                SELF_USER.isPremium = !!me?.is_premium;
                const self = rows.find(r => r.user_id === user.id);
                if (self && SELF_USER.isPremium) {
                    self.is_premium = true;
                    console.log('✅ Enforced premium for current user on leaderboard rendering');
                }
            }
        } catch (enrichErr) {
            console.warn('Self premium enrichment failed:', enrichErr);
        }

        renderLeaderboard(rows);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function renderLeaderboard(data) {
    console.log('📊 renderLeaderboard called with', data.length, 'users');
    console.log('First user premium status:', data[0]?.is_premium, 'User:', data[0]?.full_name);
    
    if (data.length === 0) {
        document.getElementById('podium').innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No data yet.</p>';
        document.getElementById('leaderboardTable').innerHTML = '';
        return;
    }

    // Render Top 3 Podium (in order: 2nd, 1st, 3rd)
    const top3 = data.slice(0, 3);
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3.length === 2 ? [top3[1], top3[0]] : [top3[0]];
    
    document.getElementById('podium').innerHTML = podiumOrder.map((user, idx) => {
        const actualRank = top3.indexOf(user) + 1;
        const medals = ['🥇', '🥈', '🥉'];
        const titles = ['Bartender', 'Brewmaster', 'Tap Master'];
        const showBadgePodium = user.is_premium === true || (SELF_USER.id && user.user_id === SELF_USER.id && SELF_USER.isPremium);
        const badge = showBadgePodium ? '<span title="PREMIUM" style="color: #FFD54F; margin-left: 0.25rem;">💎</span>' : '';
        console.log('Podium user:', user.full_name, 'is_premium:', user.is_premium, 'badge:', badge);
        
        return `
            <div class="podium-place">
                <div class="podium-user">
                    <div class="podium-rank">${medals[actualRank - 1]}</div>
                    <div class="podium-name"><button class="lb-name" data-user-id="${user.user_id}" style="all:unset; cursor:pointer; font-weight:700;">${user.full_name || 'Trader'}</button>${badge}</div>
                    <div class="podium-stats">
                        ${user.completions} completions<br>
                        ${user.discipline_score}% discipline
                    </div>
                </div>
                <div class="podium-base">
                    #${actualRank} ${titles[actualRank - 1]}
                </div>
            </div>
        `;
    }).join('');

    // Render Full Table
    const tableHTML = `
        <div class="leaderboard-row leaderboard-header">
            <div>Rank</div>
            <div>Trader</div>
            <div>Completions</div>
            <div>Discipline</div>
            <div>Level</div>
        </div>
        ${data.map((user, idx) => {
            const showBadge = user.is_premium === true || (SELF_USER.id && user.user_id === SELF_USER.id && SELF_USER.isPremium);
            const badge = showBadge ? '<span title="PREMIUM" style="color: #FFD54F; margin-left: 0.25rem;">💎</span>' : '';
            return `
                <div class="leaderboard-row">
                    <div style="font-weight: 700; color: var(--primary);">#${idx + 1}</div>
                    <div style="font-weight: 600;"><button class="lb-name" data-user-id="${user.user_id}" style="all:unset; cursor:pointer; font-weight:600;">${user.full_name || 'Trader'}</button>${badge}</div>
                    <div>${user.completions}</div>
                    <div>${user.discipline_score}%</div>
                    <div>Lv ${user.level}</div>
                </div>
            `;
        }).join('')}
    `;

    document.getElementById('leaderboardTable').innerHTML = tableHTML;
}

// Simple user profile modal for leaderboard entries
async function openUserProfileModal(userId) {
    try {
        const [{ data: row }, { data: profile }] = await Promise.all([
            supabase
                .from('leaderboard_stats')
                .select('*')
                .eq('user_id', userId)
                .single(),
            supabase
                .from('user_profiles')
                .select('avatar_url, username, is_premium')
                .eq('user_id', userId)
                .single()
        ]);
        if (!row) return;
        const isPremium = row.is_premium || !!profile?.is_premium;
        const displayName = row.full_name || profile?.username || 'Trader';
        const badge = isPremium ? '<span title="PREMIUM" style="color:#FFD54F; margin-left:0.25rem;">💎</span>' : '';
        const avatarUrl = profile?.avatar_url || '';
        const avatarBlock = avatarUrl
            ? `<img src="${avatarUrl}" alt="avatar" style="width:96px;height:96px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 0.75rem;">`
            : `<div style="width:96px;height:96px;border-radius:50%;background: linear-gradient(135deg, var(--primary), #FFB84D); display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin:0 auto 0.75rem;">👤</div>`;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:520px;">
                <span class="close-button" onclick="this.closest('.modal').remove()">&times;</span>
                <div style="text-align:center; margin-bottom:0.5rem;">${avatarBlock}</div>
                <h2 style="margin-bottom:1rem; text-align:center;">${displayName} ${badge}</h2>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                    <div style="background: rgba(255,255,255,0.05); padding:1rem; border-radius:12px; text-align:center;">
                        <div style="font-size:1.75rem; font-weight:800; color:var(--primary);">${row.level}</div>
                        <div style="font-size:0.8rem; color: var(--text-secondary);">Level</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding:1rem; border-radius:12px; text-align:center;">
                        <div style="font-size:1.75rem; font-weight:800;">${row.completions}</div>
                        <div style="font-size:0.8rem; color: var(--text-secondary);">Completions</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding:1rem; border-radius:12px; text-align:center; grid-column: span 2;">
                        <div style="font-size:1.25rem; font-weight:700;">${row.discipline_score}%</div>
                        <div style="font-size:0.8rem; color: var(--text-secondary);">Discipline</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
{{ ... }}
        console.warn('openUserProfileModal failed', e);
    }
}

// Event delegation for leaderboard name clicks
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lb-name');
    if (btn && btn.dataset.userId) {
        openUserProfileModal(btn.dataset.userId);
    }
});

// Export functions
window.switchTab = switchTab;
window.purchaseReward = purchaseReward;
