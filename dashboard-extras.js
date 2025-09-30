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
    
    const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
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
                <h3 style="margin: 0.5rem 0;">${user.user_metadata?.full_name || 'Trader'}</h3>
                <p style="color: var(--text-secondary); font-size: 0.875rem;">${user.email}</p>
            </div>
            
            <div style="background: rgba(255, 149, 0, 0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: center;">
                    <div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${progress?.level || 1}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Level</div>
                    </div>
                    <div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${progress?.total_check_ins || 0}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Total XP</div>
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
                <button class="cta-secondary" onclick="if(confirm('Are you sure?')) alert('Account deletion coming soon!')" style="width: 100%; background: rgba(244, 67, 54, 0.2); border-color: #F44336; color: #F44336;">
                    🗑️ Delete Account
                </button>
            </div>
            
            <button class="cta-primary-large" onclick="this.closest('.modal').remove()">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function toggleNotificationSettings(enabled) {
    if (enabled) {
        requestNotificationPermission();
    } else {
        console.log('Notifications disabled in settings');
    }
}

// Export functions
window.loadRecentActivity = loadRecentActivity;
window.openProfileModal = openProfileModal;
window.openLeaderboardModal = openLeaderboardModal;
window.openSettingsModal = openSettingsModal;
