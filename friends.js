document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        await loadFollowingData();
        await loadLeaderboard();

        // Wire ranking controls
        const sortSel = document.getElementById('rankingSortSelect');
        const filterSel = document.getElementById('rankingFilterSelect');
        if (sortSel) sortSel.addEventListener('change', () => loadLeaderboard());
        if (filterSel) filterSel.addEventListener('change', () => loadLeaderboard());
    } catch (error) {
        console.error('Error initializing following:', error);
        alert('Failed to load following. Please refresh the page.');
    }
});

async function loadFollowingData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

    // Fetch all users current user is following
    const { data: follows, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

    if (error) {
        console.error('Error fetching following data:', error);
        return;
    }

    const followingList = document.getElementById('followingList');
    followingList.innerHTML = '';

    if (!follows || follows.length === 0) {
        followingList.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:1rem;">Not following anyone yet.</div>';
        return;
    }

    // Fetch usernames and premium status (with robust fallbacks)
    const followingIds = follows.map(f => f.following_id);
    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, username, is_premium, avatar, avatar_url')
        .in('user_id', followingIds);
    const { data: lbRows } = await supabase
        .from('leaderboard_stats')
        .select('user_id, full_name, email, is_premium')
        .in('user_id', followingIds);

    const profileMap = new Map();
    // Primary: username from user_profiles
    (profiles || []).forEach(p => profileMap.set(p.user_id, {
        username: (p.username && p.username.trim()) ? p.username : null,
        is_premium: !!p.is_premium,
        avatar: p.avatar || null,
        avatar_url: p.avatar_url || null
    }));
    // Fallback: full_name/email from leaderboard_stats
    (lbRows || []).forEach(r => {
        const fallbackName = (r.full_name && r.full_name.trim())
            ? r.full_name
            : (r.email ? (r.email.split('@')[0]) : null);
        const existing = profileMap.get(r.user_id);
        if (!existing) {
            profileMap.set(r.user_id, { username: fallbackName || 'User', is_premium: !!r.is_premium });
        } else {
            if (!existing.username || existing.username.trim() === '') {
                existing.username = fallbackName || 'User';
            }
            existing.is_premium = existing.is_premium || !!r.is_premium;
            profileMap.set(r.user_id, existing);
        }
    });

    // Render following list
    follows.forEach(f => {
        const followingId = f.following_id;
        const followingEl = document.createElement('div');
        followingEl.className = 'user-item';
        const profile = profileMap.get(followingId) || { username: 'User', is_premium: false };
        const badge = profile.is_premium ? '<span title="PREMIUM" style="color: #FFD54F; margin-left: 0.25rem;">💎</span>' : '';
        const avatarUrl = profile.avatar_url || (typeof profile.avatar === 'string' && profile.avatar.startsWith('http') ? profile.avatar : null);
        const avatarEmoji = avatarUrl ? '' : (profile.avatar || '👤');
        const avatarBlock = avatarUrl
            ? `<button class="lb-avatar" data-user-id="${followingId}" style="all:unset; cursor:pointer;"><img src="${avatarUrl}" alt="avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block;"></button>`
            : `<button class="lb-avatar" data-user-id="${followingId}" style="all:unset; cursor:pointer;"><div style="width:32px;height:32px;border-radius:50%;background: linear-gradient(135deg, var(--primary), #FFB84D); display:flex;align-items:center;justify-content:center;font-size:1rem;">${avatarEmoji}</div></button>`;
        followingEl.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.75rem; justify-content:space-between; width:100%;">
                <div style="display:flex; align-items:center; gap:0.6rem;">
                    ${avatarBlock}
                    <span><button class="lb-name" data-user-id="${followingId}" style="all:unset; cursor:pointer; font-weight:600;">${profile.username || 'User'}</button>${badge}</span>
                </div>
                <button onclick="unfollowUser('${followingId}')">Unfollow</button>
            </div>`;
        followingList.appendChild(followingEl);
    });
    } catch (error) {
        console.error('Error loading following data:', error);
        throw error;
    }
}

async function searchUsers() {
    try {
        const searchInput = document.getElementById('searchUser');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.trim();
        if (searchTerm.length < 3) return;

    // Search by username in user_profiles
    const [profilesRes, emailRes] = await Promise.all([
        supabase
            .from('user_profiles')
            .select('user_id, username, is_premium')
            .ilike('username', `%${searchTerm}%`)
            .limit(10),
        // Search by email in leaderboard_stats view (if term looks like email or contains @)
        (searchTerm.includes('@')
            ? supabase
                .from('leaderboard_stats')
                .select('user_id, email, full_name, is_premium')
                .ilike('email', `%${searchTerm}%`)
                .limit(10)
            : Promise.resolve({ data: [], error: null }))
    ]);

    const profiles = profilesRes.data || [];
    const emailRows = emailRes.data || [];
    const map = new Map();
    profiles.forEach(p => map.set(p.user_id, { user_id: p.user_id, username: p.username, is_premium: !!p.is_premium }));
    emailRows.forEach(r => {
        if (!map.has(r.user_id)) {
            map.set(r.user_id, { user_id: r.user_id, username: r.full_name || r.email, is_premium: !!r.is_premium });
        }
    });

    const resultsList = document.getElementById('searchResultsList');
    resultsList.innerHTML = '';
    
    // Check which users current user is already following
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data: currentFollows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id);
    const followingSet = new Set((currentFollows || []).map(f => f.following_id));
    
    Array.from(map.values()).forEach(profile => {
        if (profile.user_id === currentUser.id) return; // Skip self
        const resultEl = document.createElement('div');
        resultEl.className = 'user-item';
        const badge = profile.is_premium ? '<span title="PREMIUM" style="color: #FFD54F; margin-left: 0.25rem;">💎</span>' : '';
        const isFollowing = followingSet.has(profile.user_id);
        const actionBtn = isFollowing 
            ? `<button onclick="unfollowUser('${profile.user_id}')">Unfollow</button>`
            : `<button onclick="followUser('${profile.user_id}')">Follow</button>`;
        resultEl.innerHTML = `<span>${profile.username}${badge}</span> ${actionBtn}`;
        resultsList.appendChild(resultEl);
    });
    } catch (error) {
        console.error('Error searching users:', error);
        alert('Search failed. Please try again.');
    }
}

async function followUser(userId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        if (user.id === userId) return alert("You can't follow yourself!");
        
        const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
        if (error) {
            console.error('Error following user:', error);
            alert('Error following user (maybe already following).');
        } else {
            alert('Now following!');
            await loadFollowingData();
        }
    } catch (error) {
        console.error('Error following user:', error);
        alert('An error occurred. Please try again.');
    }
}

async function unfollowUser(userId) {
    if (!confirm('Unfollow this user?')) return;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { error } = await supabase.from('follows').delete().match({ follower_id: user.id, following_id: userId });
        if (error) {
            console.error('Error unfollowing user:', error);
            alert('Error unfollowing user.');
        } else {
            await loadFollowingData();
        }
    } catch (error) {
        console.error('Error unfollowing user:', error);
        alert('An error occurred. Please try again.');
    }
}

// Leaderboard functionality
async function loadLeaderboard() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Show skeleton while loading
        const leaderboardEl = document.getElementById('leaderboardList');
        if (leaderboardEl) {
            leaderboardEl.innerHTML = Array.from({length: 6}).map(() => `
                <div class="user-item" style="opacity:0.6;">
                    <div style="display:flex; align-items:center; gap:0.75rem; width:100%;">
                        <div style="width:2.5rem; height:1rem; background: rgba(255,255,255,0.07); border-radius:4px;"></div>
                        <div style="flex:1; height:1rem; background: rgba(255,255,255,0.07); border-radius:4px;"></div>
                    </div>
                </div>
            `).join('');
        }

        // Inputs
        const sortSel = document.getElementById('rankingSortSelect');
        const filterSel = document.getElementById('rankingFilterSelect');
        const sortVal = sortSel ? sortSel.value : 'xp';
        const filterVal = filterSel ? filterSel.value : 'all';

        // Build base query
        let query = supabase
            .from('user_progress')
            .select('user_id, experience, level');

        // Order by
        if (sortVal === 'level') query = query.order('level', { ascending: false });
        else if (sortVal === 'username') {
            // We'll sort by username client-side after join, so use XP as secondary order
            query = query.order('experience', { ascending: false });
        } else {
            query = query.order('experience', { ascending: false });
        }

        query = query.limit(100);
        const { data: leaderboard, error } = await query;

        if (error) {
            console.error('Error loading leaderboard:', error);
            return;
        }

        if (!leaderboard || leaderboard.length === 0) {
            document.getElementById('leaderboardList').innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No users yet. Be the first!</div>';
            return;
        }

        // Fetch usernames and premium status
        const userIds = leaderboard.map(r => r.user_id);
        const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, username, is_premium')
            .in('user_id', userIds);

        const profileMap = new Map();
        (profiles || []).forEach(p => profileMap.set(p.user_id, { username: p.username || 'User', is_premium: !!p.is_premium }));

        // Apply filter: following only
        let rows = leaderboard;
        if (filterVal === 'following') {
            // Use follows to filter
            const { data: follows } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', user.id);
            const followingIds = new Set((follows || []).map(f => f.following_id));
            rows = rows.filter(r => followingIds.has(r.user_id));
        }

        // Client sort by username if selected
        if (sortVal === 'username') {
            rows = rows.sort((a, b) => {
                const A = (profileMap.get(a.user_id)?.username || '').toLowerCase();
                const B = (profileMap.get(b.user_id)?.username || '').toLowerCase();
                return A.localeCompare(B);
            });
        }

        const leaderboardEl2 = document.getElementById('leaderboardList');
        leaderboardEl2.innerHTML = '';

        rows.forEach((entry, index) => {
            const profile = profileMap.get(entry.user_id) || { username: 'User', is_premium: false };
            const badge = profile.is_premium ? '<span title="PREMIUM" style="color: #FFD54F; margin-left: 0.25rem;">💎</span>' : '';
            const isCurrentUser = entry.user_id === user.id;
            const rank = index + 1;
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            
            const itemEl = document.createElement('div');
            itemEl.className = 'user-item';
            itemEl.style.background = isCurrentUser ? 'rgba(255,149,0,0.1)' : '';
            itemEl.style.borderLeft = isCurrentUser ? '3px solid var(--primary)' : '';
            itemEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">
                    <div style="font-weight: 700; min-width: 2.5rem; text-align: center; font-size: 1.125rem;">${rankEmoji}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;"><button class="lb-name" data-user-id="${entry.user_id}" style="all:unset; cursor:pointer; font-weight:600;">${profile.username}</button>${badge}${isCurrentUser ? ' <span style="font-size: 0.75rem; color: var(--primary);">(You)</span>' : ''}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Level ${entry.level} • ${entry.experience} XP</div>
                    </div>
                </div>
            `;
            leaderboardEl2.appendChild(itemEl);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Event delegation for profile modal from ranking names
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lb-name');
    if (btn && btn.dataset.userId) {
        if (typeof openUserProfileById === 'function') {
            openUserProfileById(btn.dataset.userId);
        }
    }
});

// Export functions to global scope for HTML onclick handlers
window.searchUsers = searchUsers;
window.followUser = followUser;
window.unfollowUser = unfollowUser;
window.loadLeaderboard = loadLeaderboard;
