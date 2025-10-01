// Beer System - Progress Management

// Load user profile and display username
async function loadUserProfile() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get username from user_profiles table
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('username, avatar')
            .eq('user_id', user.id)
            .single();

        if (profile && profile.username) {
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = profile.username;
            }
            console.log('✅ Loaded username:', profile.username);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard initializing...');
    loadUserProfile();
});

// Progress Token Options
const PROGRESS_TOKENS = {
    beer: { name: 'Beer', emoji: '🍺' },
    wine: { name: 'Wine', emoji: '🍷' },
    donut: { name: 'Donut', emoji: '🍩' },
    diamond: { name: 'Diamond', emoji: '💎' }
};

// XP Level System
const calculateLevelFromXP = (xp) => {
    // XP needed for next level increases exponentially
    // Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, Level 4: 500 XP, etc.
    let level = 1;
    let totalXPNeeded = 0;
    let nextLevelXP = 100;
    
    while (xp >= totalXPNeeded + nextLevelXP) {
        totalXPNeeded += nextLevelXP;
        level++;
        nextLevelXP = Math.floor(100 * Math.pow(1.5, level - 1));
    }
    
    return {
        level,
        currentLevelXP: xp - totalXPNeeded,
        nextLevelXP,
        progress: ((xp - totalXPNeeded) / nextLevelXP) * 100
    };
};

// Streak Multiplier Calculation
const calculateStreakMultiplier = (streak) => {
    if (streak < 3) return 1.0;
    if (streak < 7) return 1.1;
    if (streak < 14) return 1.25;
    if (streak < 30) return 1.5;
    if (streak < 60) return 2.0;
    if (streak < 90) return 2.5;
    return 3.0; // 90+ days
};

// Level Bonus Calculation
const calculateLevelBonus = (level) => {
    return 1.0 + (level * 0.05); // 5% bonus per level
};

// Achievement Bonus Calculation (rarity-based)
const calculateAchievementBonus = (achievements) => {
    // Map rarity to multiplier so rarer achievements give more boost
    const rarityMap = {
        common: 1.02,
        rare: 1.05,
        epic: 1.1,
        legendary: 1.2
    };
    let bonus = 1.0;
    achievements.forEach(a => {
        const rarity = (a.rarity || 'common').toLowerCase();
        const mult = rarityMap[rarity] || 1.02;
        bonus *= mult;
    });
    return bonus;
};

// Total Growth Multiplier (COMPOUNDING FORMULA)
const calculateTotalGrowth = (baseProgress, streak, level, achievements) => {
    const streakMultiplier = calculateStreakMultiplier(streak);
    const levelBonus = calculateLevelBonus(level);
    const achievementBonus = calculateAchievementBonus(achievements);
    
    return baseProgress * streakMultiplier * levelBonus * achievementBonus;
};

// Calculate projected final balance with COMPOUND growth
// Each glass = 15% of CURRENT balance (compounding)
const calculateProjectedBalance = (startingBalance, targetPercent, totalBottles) => {
    const multiplier = 1 + (targetPercent / 100);
    return startingBalance * Math.pow(multiplier, totalBottles);
};

// Check if rules were followed in a trade/completion
const checkRulesFollowed = async (userId, tradeData) => {
    // Get user's trading rules
    const { data: rules } = await supabase
        .from('trading_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
    
    if (!rules) return { followed: true, violations: [] };
    
    const violations = [];
    
    // Check max risk per trade
    if (tradeData.risk_percent && tradeData.risk_percent > rules.max_risk_per_trade) {
        violations.push(`Risk ${tradeData.risk_percent}% exceeded max ${rules.max_risk_per_trade}%`);
    }
    
    // Check max daily loss
    if (tradeData.loss_percent && Math.abs(tradeData.loss_percent) > rules.max_daily_loss) {
        violations.push(`Loss ${Math.abs(tradeData.loss_percent)}% exceeded max ${rules.max_daily_loss}%`);
    }
    
    // Check max trades per day
    if (tradeData.trades_today && tradeData.trades_today > rules.max_trades_per_day) {
        violations.push(`Trades count ${tradeData.trades_today} exceeded max ${rules.max_trades_per_day}`);
    }
    
    return {
        followed: violations.length === 0,
        violations
    };
};

// Daily Check-in Function
async function performDailyCheckIn(userId, checkInData) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get current progress
        const { data: progress, error: progressError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (progressError) throw progressError;
        
        // Check if already checked in today
        const { data: existingCheckIn } = await supabase
            .from('daily_check_ins')
            .select('*')
            .eq('user_id', userId)
            .eq('check_in_date', today)
            .single();
        
        if (existingCheckIn) {
            throw new Error('Already checked in today!');
        }
        
        // Calculate new streak
        let newStreak = 1;
        if (progress.last_check_in_date) {
            const lastCheckIn = new Date(progress.last_check_in_date);
            const todayDate = new Date(today);
            const daysDiff = Math.floor((todayDate - lastCheckIn) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 1) {
                // Consecutive day
                newStreak = progress.streak + 1;
            } else if (daysDiff === 0) {
                // Same day (shouldn't happen due to check above)
                newStreak = progress.streak;
            } else {
                // Streak broken
                newStreak = 1;
            }
        }
        
        // Calculate XP earned
        const baseXP = 10;
        const streakBonus = Math.floor(newStreak * 2);
        const disciplineBonus = checkInData.discipline_rating * 5;
        const totalXP = baseXP + streakBonus + disciplineBonus;
        
        // Insert check-in
        const { error: checkInError } = await supabase
            .from('daily_check_ins')
            .insert({
                user_id: userId,
                check_in_date: today,
                discipline_rating: checkInData.discipline_rating,
                followed_rules: checkInData.followed_rules,
                traded_today: checkInData.traded_today,
                trades_count: checkInData.trades_count || 0,
                win_rate: checkInData.win_rate,
                profit_loss: checkInData.profit_loss,
                notes: checkInData.notes,
                emotions: checkInData.emotions,
                xp_earned: totalXP,
                streak_at_time: newStreak
            });
        
        if (checkInError) throw checkInError;
        
        // Update progress
        const newXP = progress.experience + totalXP;
        const levelInfo = calculateLevelFromXP(newXP);
        const longestStreak = Math.max(newStreak, progress.longest_streak);
        
        // Calculate discipline score (weighted average)
        const newDisciplineScore = ((progress.discipline_score * progress.total_check_ins) + checkInData.discipline_rating) / (progress.total_check_ins + 1);
        
        // Calculate multipliers
        const streakMultiplier = calculateStreakMultiplier(newStreak);
        const levelBonus = calculateLevelBonus(levelInfo.level);
        
        const { error: updateError } = await supabase
            .from('user_progress')
            .update({
                streak: newStreak,
                longest_streak: longestStreak,
                discipline_score: newDisciplineScore,
                level: levelInfo.level,
                experience: newXP,
                next_level_xp: levelInfo.nextLevelXP,
                total_check_ins: progress.total_check_ins + 1,
                last_check_in_date: today,
                streak_multiplier: streakMultiplier,
                level_bonus: levelBonus
            })
            .eq('user_id', userId);
        
        if (updateError) throw updateError;
        
        // Check for new achievements
        await checkAndUnlockAchievements(userId, {
            check_ins: progress.total_check_ins + 1,
            streak: newStreak,
            level: levelInfo.level,
            completions: progress.beers_cracked,
            discipline_score: newDisciplineScore
        });
        
        return {
            success: true,
            xpEarned: totalXP,
            newStreak,
            newLevel: levelInfo.level,
            leveledUp: levelInfo.level > progress.level
        };
        
    } catch (error) {
        console.error('Error performing check-in:', error);
        throw error;
    }
}

// Crack a Beer (Complete a Target)
async function crackBeer(userId, completionData) {
    try {
        // Get current progress and goals
        const { data: progress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        const { data: goals } = await supabase
            .from('user_goals')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();
        
        if (!goals) throw new Error('No active goals found');
        
        // Check if rules were followed
        const rulesCheck = await checkRulesFollowed(userId, completionData);
        
        // Check if target was hit
        const targetHit = completionData.gain_percent >= goals.target_percent_per_beer;
        
        if (!targetHit) {
            throw new Error(`Target not reached. Needed ${goals.target_percent_per_beer}%, got ${completionData.gain_percent}%`);
        }
        
        if (!rulesCheck.followed) {
            throw new Error(`Rules violated: ${rulesCheck.violations.join(', ')}`);
        }
        
        const newBeersCracked = progress.beers_cracked + 1;
        const newBottlesRemaining = goals.bottles_remaining - 1;
        
        // Calculate XP for completion
        const completionXP = 100;
        const newXP = progress.experience + completionXP;
        const levelInfo = calculateLevelFromXP(newXP);
        
        // Insert beer completion record
        const { error: completionError } = await supabase
            .from('beer_completions')
            .insert({
                user_id: userId,
                beer_number: newBeersCracked,
                starting_balance: completionData.starting_balance,
                ending_balance: completionData.ending_balance,
                gain_amount: completionData.gain_amount,
                gain_percent: completionData.gain_percent,
                target_percent: goals.target_percent_per_beer,
                trades_count: completionData.trades_count || 0,
                rules_followed: true,
                notes: completionData.notes
            });
        
        if (completionError) throw completionError;
        
        // Update progress
        const { error: progressError } = await supabase
            .from('user_progress')
            .update({
                beers_cracked: newBeersCracked,
                experience: newXP,
                level: levelInfo.level,
                next_level_xp: levelInfo.nextLevelXP
            })
            .eq('user_id', userId);
        
        if (progressError) throw progressError;
        
        // Update goals
        await supabase
            .from('user_goals')
            .update({
                current_capital: completionData.ending_balance,
                bottles_remaining: newBottlesRemaining,
                bottles_cracked: newBeersCracked
            })
            .eq('id', goals.id);
        
        // Check for achievements
        await checkAndUnlockAchievements(userId, {
            beers_cracked: newBeersCracked,
            level: levelInfo.level
        });
        
        return {
            success: true,
            beers_cracked: newBeersCracked,
            bottlesRemaining: newBottlesRemaining,
            xpEarned: completionXP,
            leveledUp: levelInfo.level > progress.level,
            message: `🍺 Beer #${newBeersCracked} cracked! ${newBottlesRemaining} bottles remaining on the wall.`
        };
        
    } catch (error) {
        console.error('Error cracking beer:', error);
        throw error;
    }
}

// Spill a Beer (Rule Violation or Excessive Loss)
async function spillBeer(userId, spillData) {
    try {
        // Get current progress and goals
        const { data: progress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        const { data: goals } = await supabase
            .from('user_goals')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();
        
        const newBeersSpilled = progress.beers_spilled + 1;
        
        // Insert beer spill record
        const { error: spillError } = await supabase
            .from('beer_spills')
            .insert({
                user_id: userId,
                starting_balance: spillData.starting_balance,
                ending_balance: spillData.ending_balance,
                loss_amount: spillData.loss_amount,
                loss_percent: spillData.loss_percent,
                max_loss_percent: goals.max_loss_percent,
                rule_violations: spillData.violations || [],
                trades_involved: spillData.trades_count || 1,
                notes: spillData.notes
            });
        
        if (spillError) throw spillError;
        
        // Update progress
        await supabase
            .from('user_progress')
            .update({
                beers_spilled: newBeersSpilled
            })
            .eq('user_id', userId);
        
        // Update goals
        await supabase
            .from('user_goals')
            .update({
                beers_spilled: newBeersSpilled,
                current_capital: spillData.ending_balance
            })
            .eq('id', goals.id);
        
        return {
            success: true,
            beersSpilled: newBeersSpilled,
            message: `🚨 Beer spilled! Rules violated or loss exceeded limit.`
        };
        
    } catch (error) {
        console.error('Error recording beer spill:', error);
        throw error;
    }
}

// Check and Unlock Achievements
async function checkAndUnlockAchievements(userId, stats) {
    try {
        // Get all achievements
        const { data: allAchievements } = await supabase
            .from('achievements')
            .select('*');
        
        // Get user's unlocked achievements
        const { data: unlockedAchievements } = await supabase
            .from('user_achievements')
            .select('achievement_id')
            .eq('user_id', userId);
        
        const unlockedIds = unlockedAchievements.map(ua => ua.achievement_id);
        
        // Check each achievement
        const newlyUnlocked = [];
        
        for (const achievement of allAchievements) {
            if (unlockedIds.includes(achievement.id)) continue;
            
            let unlocked = false;
            
            switch (achievement.requirement_type) {
                case 'check_ins':
                    unlocked = stats.check_ins >= achievement.requirement_value;
                    break;
                case 'streak':
                    unlocked = stats.streak >= achievement.requirement_value;
                    break;
                case 'completions':
                    // Generic completions metric to stay token-agnostic
                    // If not provided, fallback to beers_cracked
                    unlocked = (stats.completions ?? stats.beers_cracked ?? 0) >= achievement.requirement_value;
                    break;
                case 'beers_cracked':
                    unlocked = stats.beers_cracked >= achievement.requirement_value;
                    break;
                case 'level':
                    unlocked = stats.level >= achievement.requirement_value;
                    break;
                case 'discipline_score':
                    unlocked = stats.discipline_score >= achievement.requirement_value;
                    break;
            }
            
            if (unlocked) {
                await supabase
                    .from('user_achievements')
                    .insert({
                        user_id: userId,
                        achievement_id: achievement.id
                    });
                
                newlyUnlocked.push(achievement);
            }
        }
        
        // Update achievement bonus if new achievements unlocked
        if (newlyUnlocked.length > 0) {
            const { data: allUserAchievements } = await supabase
                .from('user_achievements')
                .select('achievement_id, achievements(rarity)')
                .eq('user_id', userId);

            const achievementBonus = calculateAchievementBonus(
                (allUserAchievements || []).map(ua => ({ rarity: ua.achievements?.rarity }))
            );

            await supabase
                .from('user_progress')
                .update({ achievement_bonus: achievementBonus })
                .eq('user_id', userId);
        }
        
        return newlyUnlocked;
        
    } catch (error) {
        console.error('Error checking achievements:', error);
        return [];
    }
}

// Get User Progress Summary
async function getUserProgressSummary(userId) {
    try {
        console.log('Getting progress for user:', userId);
        
        const { data: progress, error: progressError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (progressError) {
            console.error('Progress error:', progressError);
        }
        console.log('Progress data:', progress);
        
        const { data: goals, error: goalsError } = await supabase
            .from('user_goals')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();
        
        if (goalsError) {
            console.error('Goals error:', goalsError);
        }
        console.log('Goals data:', goals);
        
        const { data: achievements } = await supabase
            .from('user_achievements')
            .select('*, achievements(*)')
            .eq('user_id', userId);
        
        const tokenType = progress?.progress_token || 'beer';
        console.log('Token type from DB:', tokenType);
        console.log('Available tokens:', PROGRESS_TOKENS);
        
        const token = {
            type: tokenType,
            ...PROGRESS_TOKENS[tokenType]
        } || { type: 'beer', ...PROGRESS_TOKENS.beer };
        
        console.log('Final token object:', token);
        
        const totalGrowth = calculateTotalGrowth(
            1.0,
            progress?.streak || 0,
            progress?.level || 1,
            achievements ? achievements.map(a => a.achievements) : []
        );
        
        // Calculate progress percentage
        const progressPercent = goals ? (progress.beers_cracked / goals.total_bottles) * 100 : 0;
        
        // Calculate projected final balance
        const projectedBalance = goals ? calculateProjectedBalance(
            goals.starting_capital,
            goals.target_percent_per_beer,
            goals.total_bottles
        ) : 0;
        
        return {
            ...progress,
            goals,
            token,
            progressPercent,
            projectedBalance,
            totalGrowthMultiplier: totalGrowth,
            achievements: achievements ? achievements.map(a => a.achievements) : []
        };
        
    } catch (error) {
        console.error('Error getting progress summary:', error);
        return null;
    }
}

// Export function globally
window.recalculateUserLevel = recalculateUserLevel;


// Recalculate user level based on current XP
async function recalculateUserLevel() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Get current XP
        const { data: progress } = await supabase
            .from('user_progress')
            .select('xp, level')
            .eq('user_id', user.id)
            .single();
            
        if (!progress) return;
        
        // Calculate level based on XP
        let newLevel = 1;
        if (progress.xp >= 1000) newLevel = 5;
        else if (progress.xp >= 500) newLevel = 4;
        else if (progress.xp >= 250) newLevel = 3;
        else if (progress.xp >= 100) newLevel = 2;
        
        // Update level if changed
        if (newLevel !== progress.level) {
            await supabase
            .from('user_progress')
            .update({ level: newLevel })
            .eq('user_id', user.id);
            console.log();
        }
        
        return newLevel;
    } catch (error) {
        console.error('Error recalculating level:', error);
        return null;
    }
}

// Make it globally available
window.recalculateUserLevel = recalculateUserLevel;
