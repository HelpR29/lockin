// Live XP Update - Real-time XP bar updates across all pages

async function updateXPBar() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: progress } = await supabase
            .from('user_progress')
            .select('total_check_ins, level')
            .eq('user_id', user.id)
            .single();

        if (!progress) return;

        const currentXP = progress.total_check_ins || 0;
        const currentLevel = progress.level || 1;
        const xpForNextLevel = currentLevel * 100;
        const xpPercentage = (currentXP / xpForNextLevel) * 100;

        // Update XP display elements (Dashboard)
        const xpProgressEl = document.getElementById('xpProgress');
        const currentLevelEl = document.getElementById('currentLevel');
        const xpBarFill = document.getElementById('xpBarFill');

        if (xpProgressEl) {
            xpProgressEl.textContent = `${currentXP} / ${xpForNextLevel} XP`;
        }

        if (currentLevelEl) {
            currentLevelEl.textContent = currentLevel;
        }

        if (xpBarFill) {
            xpBarFill.style.width = `${Math.min(xpPercentage, 100)}%`;
        }
        
        // Also try alternative selectors for other pages
        const xpText = document.querySelector('.xp-text, #xpText');
        const levelText = document.querySelector('.level-text, #levelText');
        
        if (xpText) {
            xpText.textContent = `${currentXP} / ${xpForNextLevel} XP`;
        }

        if (levelText) {
            levelText.textContent = `Level ${currentLevel}`;
        }

        console.log(`✅ XP Updated: ${currentXP}/${xpForNextLevel} XP (${xpPercentage.toFixed(1)}%)`);
    } catch (error) {
        console.error('Error updating XP bar:', error);
    }
}

// Update XP bar every 5 seconds
setInterval(updateXPBar, 5000);

// Update immediately on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateXPBar);
} else {
    updateXPBar();
}

// Export to global
window.updateXPBar = updateXPBar;
