// Achievement Tracking System
// Automatically checks and awards achievements based on user progress

async function checkAndAwardAchievements() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user progress data
        const [progressRes, tradesRes, violationsRes, achievementsRes] = await Promise.all([
            supabase.from('user_progress').select('*').eq('user_id', user.id).single(),
            supabase.from('trades').select('*').eq('user_id', user.id).eq('status', 'closed'),
            supabase.from('rule_violations').select('*').eq('user_id', user.id),
            supabase.from('achievements').select('*').eq('is_active', true)
        ]);

        const progress = progressRes.data;
        const trades = tradesRes.data || [];
        const violations = violationsRes.data || [];
        const allAchievements = achievementsRes.data || [];

        // Get already earned achievements
        const { data: earnedAchievements } = await supabase
            .from('user_achievements')
            .select('achievement_id')
            .eq('user_id', user.id);

        const earnedIds = new Set(earnedAchievements?.map(a => a.achievement_id) || []);

        // Check each achievement
        for (const achievement of allAchievements) {
            // Skip if already earned
            if (earnedIds.has(achievement.id)) continue;

            let earned = false;

            switch (achievement.requirement_type) {
                case 'count':
                    // Check completion count
                    earned = (progress?.beers_cracked || 0) >= achievement.requirement_value;
                    break;

                case 'streak':
                    // Check completion streak (consecutive days)
                    earned = await checkCompletionStreak(user.id, achievement.requirement_value);
                    break;

                case 'rules':
                    // Check days without rule violations
                    earned = await checkRuleAdherence(user.id, achievement.requirement_value);
                    break;

                case 'journal':
                    // Check journaling streak
                    earned = await checkJournalingStreak(user.id, achievement.requirement_value);
                    break;
            }

            if (earned) {
                await awardAchievement(user.id, achievement);
            }
        }
    } catch (error) {
        console.error('Error checking achievements:', error);
    }
}

async function checkCompletionStreak(userId, requiredStreak) {
    try {
        const { data: progress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .single();

        // Check if user has completed goals on consecutive days
        // For now, check if they have >= requiredStreak completions
        // TODO: Implement proper streak tracking with dates
        return (progress?.beers_cracked || 0) >= requiredStreak;
    } catch (error) {
        console.error('Error checking streak:', error);
        return false;
    }
}

async function checkRuleAdherence(userId, requiredDays) {
    try {
        const { data: violations } = await supabase
            .from('rule_violations')
            .select('created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (!violations || violations.length === 0) {
            // No violations ever - check account age
            const { data: { user } } = await supabase.auth.getUser();
            const accountAge = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
            return accountAge >= requiredDays;
        }

        // Check days since last violation
        const lastViolation = new Date(violations[0].created_at);
        const daysSince = (Date.now() - lastViolation.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince >= requiredDays;
    } catch (error) {
        console.error('Error checking rule adherence:', error);
        return false;
    }
}

async function checkJournalingStreak(userId, requiredDays) {
    try {
        const { data: trades } = await supabase
            .from('trades')
            .select('created_at, notes')
            .eq('user_id', userId)
            .not('notes', 'is', null)
            .order('created_at', { ascending: false });

        if (!trades || trades.length < requiredDays) return false;

        // Check for consecutive days with journal entries
        const dates = trades
            .filter(t => t.notes && t.notes.length > 10)
            .map(t => new Date(t.created_at).toDateString());

        const uniqueDates = [...new Set(dates)];
        
        // Check if we have requiredDays consecutive days
        let streak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
            const prev = new Date(uniqueDates[i - 1]);
            const curr = new Date(uniqueDates[i]);
            const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
            
            if (diffDays === 1) {
                streak++;
                if (streak >= requiredDays) return true;
            } else {
                streak = 1;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking journaling streak:', error);
        return false;
    }
}

async function awardAchievement(userId, achievement) {
    try {
        // Insert achievement
        const { error: achError } = await supabase
            .from('user_achievements')
            .insert({
                user_id: userId,
                achievement_id: achievement.id
            });

        if (achError) {
            console.error('Error awarding achievement:', achError);
            return;
        }

        // Award stars
        if (achievement.star_reward > 0) {
            await awardStars(userId, achievement.star_reward);
        }

        // Award XP
        if (achievement.xp_reward > 0) {
            await awardXP(userId, achievement.xp_reward);
        }

        // Show notification
        showAchievementNotification(achievement);

        console.log(`🏆 Achievement Unlocked: ${achievement.name}`);
    } catch (error) {
        console.error('Error awarding achievement:', error);
    }
}

async function awardStars(userId, stars) {
    try {
        // Check if user_stars record exists
        const { data: existing } = await supabase
            .from('user_stars')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (existing) {
            // Update existing
            await supabase
                .from('user_stars')
                .update({
                    total_stars: existing.total_stars + stars,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);
        } else {
            // Insert new
            await supabase
                .from('user_stars')
                .insert({
                    user_id: userId,
                    total_stars: stars
                });
        }
    } catch (error) {
        console.error('Error awarding stars:', error);
    }
}

async function awardXP(userId, xp) {
    try {
        const { data: progress } = await supabase
            .from('user_progress')
            .select('total_check_ins')
            .eq('user_id', userId)
            .single();

        if (progress) {
            await supabase
                .from('user_progress')
                .update({
                    total_check_ins: progress.total_check_ins + xp
                })
                .eq('user_id', userId);
        }
    } catch (error) {
        console.error('Error awarding XP:', error);
    }
}

function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-badge">
            <span class="achievement-icon">${achievement.icon}</span>
            <div class="achievement-details">
                <div class="achievement-title">🏆 Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-rewards">
                    ${achievement.star_reward > 0 ? `⭐ +${achievement.star_reward} stars` : ''}
                    ${achievement.xp_reward > 0 ? `🎯 +${achievement.xp_reward} XP` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Auto-check achievements on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndAwardAchievements);
} else {
    checkAndAwardAchievements();
}

// Export to global
window.checkAndAwardAchievements = checkAndAwardAchievements;
window.awardAchievement = awardAchievement;
