// Premium badge toggler
// Shows a "Premium" pill in the header when user_profiles.is_premium is true

async function updatePremiumBadge() {
  try {
    const el = document.getElementById('premiumBadge');
    const nameEl = document.getElementById('premiumNameBadge');
    if ((!el && !nameEl) || typeof supabase === 'undefined') return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (el) el.style.display = 'none';
      if (nameEl) nameEl.style.display = 'none';
      return;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_premium, created_at')
      .eq('user_id', user.id)
      .single();

    const isPremium = !!profile?.is_premium;
    // 7-day trial from created_at
    let isTrial = false;
    let trialDaysLeft = 0;
    try {
      if (profile?.created_at) {
        const created = new Date(profile.created_at);
        const daysElapsed = Math.floor((Date.now() - created.getTime()) / 86400000);
        trialDaysLeft = Math.max(0, 7 - daysElapsed);
        isTrial = trialDaysLeft > 0;
      }
    } catch (_) {}

    const isPremiumOrTrial = isPremium || isTrial;
    // Expose global state
    window.lockinPremium = { isPremium, isTrial, isPremiumOrTrial, trialDaysLeft };

    if (el) {
      el.style.display = isPremiumOrTrial ? 'inline-flex' : 'none';
      el.setAttribute('data-premium', isPremiumOrTrial ? 'true' : 'false');
      el.style.alignItems = 'center';
      el.style.gap = '0.35rem';
      el.title = isPremium ? 'PREMIUM' : (isTrial ? `TRIAL (${trialDaysLeft} days left)` : '');
    }
    if (nameEl) {
      nameEl.style.display = isPremiumOrTrial ? 'inline-flex' : 'none';
      nameEl.setAttribute('data-premium', isPremiumOrTrial ? 'true' : 'false');
      nameEl.style.alignItems = 'center';
      nameEl.style.gap = '0.25rem';
      nameEl.title = isPremium ? 'PREMIUM' : (isTrial ? `TRIAL (${trialDaysLeft} days left)` : '');
    }
  } catch (e) {
    console.warn('Premium badge update failed:', e);
  }
}

// Initialize on load and refresh periodically
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    updatePremiumBadge();
    // Refresh every 30s in case premium flips while navigating
    setInterval(() => updatePremiumBadge(), 30000);
  });
}

// Expose for manual refresh
window.updatePremiumBadge = updatePremiumBadge;
