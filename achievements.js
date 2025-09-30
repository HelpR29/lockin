document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    await loadAchievements();
    await loadMyRewards();
});

function switchAchievementView(view) {
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`button[onclick="switchAchievementView('${view}')"]`).classList.add('active');

    document.querySelectorAll('.achievement-view').forEach(v => v.classList.remove('active'));
    if (view === 'all') {
        document.getElementById('view-all-achievements').classList.add('active');
    } else {
        document.getElementById('view-my-rewards').classList.add('active');
    }
}

async function loadAchievements() {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: allAchievements, error: allErr } = await supabase
        .from('achievements')
        .select('*')
        .order('category')
        .order('requirement_value');

    const { data: unlocked, error: unlockedErr } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

    if (allErr || unlockedErr) {
        console.error('Error fetching achievements:', allErr || unlockedErr);
        return;
    }

    const unlockedIds = new Set(unlocked.map(a => a.achievement_id));
    const grid = document.getElementById('achievementsGrid');
    grid.innerHTML = '';

    for (const achievement of allAchievements) {
        const isUnlocked = unlockedIds.has(achievement.id);
        const achievementEl = document.createElement('div');
        achievementEl.className = `achievement-card ${achievement.rarity} ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        achievementEl.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <h4 class="achievement-title">${achievement.name}</h4>
                <p class="achievement-desc">${achievement.description}</p>
            </div>
            <div class="achievement-rarity">${achievement.rarity}</div>
            ${isUnlocked ? '<div class="unlocked-check">✓</div>' : ''}
        `;
        grid.appendChild(achievementEl);
    }
}

async function loadMyRewards() {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: unlocked, error } = await supabase
        .from('user_achievements')
        .select(`
            achievements!inner(
                id,
                achievement_rewards!inner(
                    rewards!inner(*)
                )
            )
        `)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error fetching rewards:', error);
        return;
    }

    const titlesGrid = document.getElementById('titlesGrid');
    const badgesGrid = document.getElementById('badgesGrid');
    titlesGrid.innerHTML = '';
    badgesGrid.innerHTML = '';

    let hasTitles = false;
    let hasBadges = false;

    for (const item of unlocked) {
        for (const rewardItem of item.achievements.achievement_rewards) {
            const reward = rewardItem.rewards;
            if (reward.type === 'title') {
                hasTitles = true;
                const titleEl = document.createElement('div');
                titleEl.className = 'reward-item';
                titleEl.textContent = reward.value;
                titlesGrid.appendChild(titleEl);
            } else if (reward.type === 'badge') {
                hasBadges = true;
                const badgeEl = document.createElement('div');
                badgeEl.className = 'reward-item';
                badgeEl.innerHTML = `<img src="/assets/badges/${reward.value}" alt="${reward.name}" /><span>${reward.name}</span>`;
                badgesGrid.appendChild(badgeEl);
            }
        }
    }

    if (!hasTitles) {
        titlesGrid.innerHTML = '<p class="no-rewards">No titles unlocked yet.</p>';
    }
    if (!hasBadges) {
        badgesGrid.innerHTML = '<p class="no-rewards">No badges unlocked yet.</p>';
    }
}
