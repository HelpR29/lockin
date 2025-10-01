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
    const xpPercentage = Math.max(0, Math.min(100, info.progress));

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

        // Ensure smooth transition once
        if (!window.__lockin_xpTransitionApplied) {
          const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';
          if (xpBarFill) xpBarFill.style.transition = `width 600ms ${easing}`;
          const hdrInit = document.getElementById('headerXpBarFill');
          if (hdrInit) hdrInit.style.transition = `width 600ms ${easing}`;
          window.__lockin_xpTransitionApplied = true;
        }

        if (xpBarFill) {
          xpBarFill.style.width = `${Math.min(xpPercentage, 100)}%`;
    }
        
        // Also update header mini widget if present
        const hdrLevelEl = document.getElementById('headerCurrentLevel');
        const hdrXpBar = document.getElementById('headerXpBarFill');
        const hdrXpText = document.getElementById('headerXpProgress');
        const hdrBarContainer = document.getElementById('headerXpBarContainer');
        if (hdrLevelEl) hdrLevelEl.textContent = currentLevel;
        if (hdrXpBar) hdrXpBar.style.width = `${Math.min(xpPercentage, 100)}%`;
        if (hdrXpText) hdrXpText.textContent = `${currentLevelXP} / ${xpForNextLevel} XP`;
        if (hdrBarContainer) hdrBarContainer.title = `${Math.max(xpForNextLevel - currentLevelXP, 0)} XP to next level`;

        // Also try alternative selectors for other pages
        const xpText = document.querySelector('.xp-text, #xpText');
        const levelText = document.querySelector('.level-text, #levelText');
        
        if (xpText) xpText.textContent = `${currentLevelXP} / ${xpForNextLevel} XP`;
        if (levelText) levelText.textContent = `Level ${currentLevel}`;

    // Level-up detection and effects
    if (typeof window.__lockin_lastLevel === 'number') {
      if (currentLevel > window.__lockin_lastLevel) {
        try { fireConfetti(); } catch (e) { /* ignore */ }
        showLevelUpToast(currentLevel);
      }
    }
    window.__lockin_lastLevel = currentLevel;

    console.log(`✅ XP Updated: L${currentLevel} ${currentLevelXP}/${xpForNextLevel} (${xpPercentage.toFixed(1)}%)`);
  } catch (error) {
    console.error('Error updating XP bar:', error);
  }
}

// Update XP bar every 5 seconds
setInterval(updateXPBar, 5000);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateXPBar);
} else {
    updateXPBar();
}

// Export to global
window.updateXPBar = updateXPBar;

// --------- Visual Effects ---------
function showLevelUpToast(level) {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.top = '16px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.zIndex = '10000';
  toast.style.background = 'rgba(34,34,36,0.9)';
  toast.style.backdropFilter = 'blur(8px)';
  toast.style.border = '1px solid rgba(255,149,0,0.4)';
  toast.style.borderRadius = '12px';
  toast.style.padding = '10px 14px';
  toast.style.color = '#fff';
  toast.style.fontSize = '0.95rem';
  toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
  toast.textContent = `🎉 Level Up! You reached Level ${level}`;

  document.body.appendChild(toast);

  toast.animate([
    { opacity: 0, transform: 'translate(-50%, -8px)' },
    { opacity: 1, transform: 'translate(-50%, 0)' }
  ], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });

  setTimeout(() => {
    toast.animate([
      { opacity: 1, transform: 'translate(-50%, 0)' },
      { opacity: 0, transform: 'translate(-50%, -8px)' }
    ], { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' })
    .onfinish = () => toast.remove();
  }, 1800);
}

function fireConfetti() {
  try {
    if (window.confetti) {
      const end = Date.now() + 600;
      (function frame() {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.15 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    } else {
      // Fallback: simple emoji burst
      const el = document.createElement('div');
      el.textContent = '✨';
      el.style.position = 'fixed';
      el.style.top = '20%';
      el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
      el.style.fontSize = '40px';
      el.style.zIndex = '9999';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 800);
    }
  } catch (e) {
    // ignore
  }
}
