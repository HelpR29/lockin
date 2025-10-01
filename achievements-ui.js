// Achievements UI - Rendering and interactions

let currentTab = 'achievements';

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadStarBalance();
    await loadAchievements();
    await loadRewardShop();
    await loadLeaderboard();
});

// Tab Switching
function switchTab(tab) {
    currentTab = tab;
    
    // Update buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tab}`).classList.add('active');
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
        const { data: leaderboard } = await supabase
            .from('leaderboard_stats')
            .select('*')
            .order('completions', { ascending: false })
            .order('discipline_score', { ascending: false})
            .limit(50);

        renderLeaderboard(leaderboard || []);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function renderLeaderboard(data) {
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
        const badge = user.is_premium ? '<span title="PREMIUM" style="color: #FFD54F; margin-left: 0.25rem;">💎</span>' : '';
        
        return `
            <div class="podium-place">
                <div class="podium-user">
                    <div class="podium-rank">${medals[actualRank - 1]}</div>
                    <div class="podium-name">${user.full_name || 'Trader'}${badge}</div>
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
            const badge = user.is_premium ? '<span title="PREMIUM" style="color: #FFD54F; margin-left: 0.25rem;">💎</span>' : '';
            return `
                <div class="leaderboard-row">
                    <div style="font-weight: 700; color: var(--primary);">#${idx + 1}</div>
                    <div style="font-weight: 600;">${user.full_name || 'Trader'}${badge}</div>
                    <div>${user.completions}</div>
                    <div>${user.discipline_score}%</div>
                    <div>Lv ${user.level}</div>
                </div>
            `;
        }).join('')}
    `;

    document.getElementById('leaderboardTable').innerHTML = tableHTML;
}

// Export functions
window.switchTab = switchTab;
window.purchaseReward = purchaseReward;
