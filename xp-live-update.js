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
        const xpProgress = (currentXP / xpForNextLevel) * 100;

        // Update XP display elements
        const xpText = document.querySelector('.xp-text, #xpText');
        const levelText = document.querySelector('.level-text, #levelText');
        const xpBar = document.querySelector('.xp-progress-bar, #xpProgressBar');
        const xpBarFill = document.querySelector('.xp-bar-fill, #xpBarFill');

        if (xpText) {
            xpText.textContent = `${currentXP} / ${xpForNextLevel} XP`;
        }

        if (levelText) {
            levelText.textContent = `Level ${currentLevel}`;
        }

        if (xpBar) {
            xpBar.style.width = `${Math.min(xpProgress, 100)}%`;
        }

        if (xpBarFill) {
            xpBarFill.style.width = `${Math.min(xpProgress, 100)}%`;
        }

        // Also update the dashboard XP text if it exists
        const dashboardXP = document.getElementById('dashboardXP');
        if (dashboardXP) {
            dashboardXP.textContent = `${currentXP} / ${xpForNextLevel} XP`;
        }

        console.log(`✅ XP Updated: ${currentXP}/${xpForNextLevel} XP (${xpProgress.toFixed(1)}%)`);
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
