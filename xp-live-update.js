// Live XP Update - Real-time XP bar updates across all pages

// Level math same as progress.js
function _calcLevelFromXP(xp) {
  let level = 1;
  let totalXPNeeded = 0;
  let nextLevelXP = 100;
  while (xp >= totalXPNeeded + nextLevelXP) {
    totalXPNeeded += nextLevelXP;
    level++;
    nextLevelXP = Math.floor(100 * Math.pow(1.5, level - 1));
  }
  return { level, currentLevelXP: xp - totalXPNeeded, nextLevelXP, progress: ((xp - totalXPNeeded) / nextLevelXP) * 100 };
}

async function updateXPBar() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: progress } = await supabase
      .from('user_progress')
      .select('experience, level')
      .eq('user_id', user.id)
      .single();

    if (!progress) return;

    const totalXP = progress.experience || 0;
    const info = _calcLevelFromXP(totalXP);
    const currentLevel = info.level;
    const xpForNextLevel = info.nextLevelXP;
    const currentLevelXP = info.currentLevelXP;
    const xpPercentage = info.progress;

        // Update XP display elements (Dashboard)
        const xpProgressEl = document.getElementById('xpProgress');
        const currentLevelEl = document.getElementById('currentLevel');
        const xpBarFill = document.getElementById('xpBarFill');

        if (xpProgressEl) {
      xpProgressEl.textContent = `${currentLevelXP} / ${xpForNextLevel} XP`;
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
      xpText.textContent = `${currentLevelXP} / ${xpForNextLevel} XP`;
    }

        if (levelText) {
      levelText.textContent = `Level ${currentLevel}`;
    }

    console.log(`✅ XP Updated: L${currentLevel} ${currentLevelXP}/${xpForNextLevel} (${xpPercentage.toFixed(1)}%)`);
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
