// Growth & Compounding System - Progress Management

// Progress Object Progression
const PROGRESS_OBJECTS = [
    { type: 'beer', name: 'Beer', emoji: '🍺', minCompletions: 0, tier: 1, multiplier: 1.0 },
    { type: 'wine', name: 'Wine', emoji: '🍷', minCompletions: 10, tier: 2, multiplier: 1.15 },
    { type: 'donut', name: 'Donut', emoji: '🍩', minCompletions: 25, tier: 3, multiplier: 1.30 },
    { type: 'diamond', name: 'Diamond', emoji: '💎', minCompletions: 50, tier: 4, multiplier: 1.50 },
    { type: 'trophy', name: 'Trophy', emoji: '🏆', minCompletions: 75, tier: 5, multiplier: 2.0 },
    { type: 'star', name: 'Star', emoji: '⭐', minCompletions: 90, tier: 6, multiplier: 2.5 },
    { type: 'medal', name: 'Medal', emoji: '🏅', minCompletions: 95, tier: 7, multiplier: 3.0 },
    { type: 'coin', name: 'Coin', emoji: '🪙', minCompletions: 99, tier: 8, multiplier: 4.0 }
];

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

// Achievement Bonus Calculation
const calculateAchievementBonus = (achievements) => {
    let bonus = 1.0;
    achievements.forEach(achievement => {
        bonus *= achievement.bonus_multiplier;
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

// Get Current Progress Object
const getCurrentProgressObject = (completions) => {
    let currentObject = PROGRESS_OBJECTS[0];
    
    for (const obj of PROGRESS_OBJECTS) {
        if (completions >= obj.minCompletions) {
            currentObject = obj;
        } else {
            break;
        }
    }
    
    return currentObject;
};

// Get Next Progress Object
const getNextProgressObject = (completions) => {
    const current = getCurrentProgressObject(completions);
    const currentIndex = PROGRESS_OBJECTS.findIndex(obj => obj.type === current.type);
    
    if (currentIndex < PROGRESS_OBJECTS.length - 1) {
        return PROGRESS_OBJECTS[currentIndex + 1];
    }
    
    return null; // Max level reached
};

// Calculate Progress to Next Object
const calculateProgressToNextObject = (completions) => {
    const current = getCurrentProgressObject(completions);
    const next = getNextProgressObject(completions);
    
    if (!next) {
        return 100; // Max level
    }
    
    const progress = ((completions - current.minCompletions) / (next.minCompletions - current.minCompletions)) * 100;
    return Math.min(progress, 100);
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
            completions: progress.completions,
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

// Complete a Trading Bottle/Token
async function completeToken(userId, completionData) {
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
        
        const newCompletions = progress.completions + 1;
        const newCurrentObject = getCurrentProgressObject(newCompletions);
        
        // Calculate XP for completion
        const completionXP = 100 * newCurrentObject.multiplier;
        const newXP = progress.experience + completionXP;
        const levelInfo = calculateLevelFromXP(newXP);
        
        // Insert completion record
        const { error: completionError } = await supabase
            .from('completions')
            .insert({
                user_id: userId,
                completion_number: newCompletions,
                completion_date: new Date().toISOString().split('T')[0],
                starting_balance: completionData.starting_balance,
                ending_balance: completionData.ending_balance,
                gain_amount: completionData.gain_amount,
                gain_percent: completionData.gain_percent,
                token_type: progress.current_progress_object,
                notes: completionData.notes,
                trades_count: completionData.trades_count
            });
        
        if (completionError) throw completionError;
        
        // Update progress
        const { error: progressError } = await supabase
            .from('user_progress')
            .update({
                completions: newCompletions,
                current_progress_object: newCurrentObject.type,
                experience: newXP,
                level: levelInfo.level,
                next_level_xp: levelInfo.nextLevelXP
            })
            .eq('user_id', userId);
        
        if (progressError) throw progressError;
        
        // Update goals
        if (goals) {
            await supabase
                .from('user_goals')
                .update({
                    current_capital: completionData.ending_balance,
                    completions_count: newCompletions
                })
                .eq('id', goals.id);
        }
        
        // Check for achievements
        await checkAndUnlockAchievements(userId, {
            completions: newCompletions,
            level: levelInfo.level
        });
        
        return {
            success: true,
            newCompletions,
            progressObject: newCurrentObject,
            xpEarned: completionXP,
            leveledUp: levelInfo.level > progress.level
        };
        
    } catch (error) {
        console.error('Error completing token:', error);
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
                    unlocked = stats.completions >= achievement.requirement_value;
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
                .select('achievement_id, achievements(bonus_multiplier)')
                .eq('user_id', userId);
            
            const achievementBonus = calculateAchievementBonus(
                allUserAchievements.map(ua => ({ bonus_multiplier: ua.achievements.bonus_multiplier }))
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
        const { data: progress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        const { data: achievements } = await supabase
            .from('user_achievements')
            .select('*, achievements(*)')
            .eq('user_id', userId);
        
        const currentObject = getCurrentProgressObject(progress.completions);
        const nextObject = getNextProgressObject(progress.completions);
        const progressToNext = calculateProgressToNextObject(progress.completions);
        
        const totalGrowth = calculateTotalGrowth(
            1.0,
            progress.streak,
            progress.level,
            achievements.map(a => a.achievements)
        );
        
        return {
            ...progress,
            currentObject,
            nextObject,
            progressToNext,
            totalGrowthMultiplier: totalGrowth,
            achievements: achievements.map(a => a.achievements)
        };
        
    } catch (error) {
        console.error('Error getting progress summary:', error);
        return null;
    }
}
