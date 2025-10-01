// Premium badge toggler
// Shows a "Premium" pill in the header when user_profiles.is_premium is true

async function updatePremiumBadge() {
  try {
    const el = document.getElementById('premiumBadge');
    if (!el || typeof supabase === 'undefined') return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { el.style.display = 'none'; return; }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_premium')
      .eq('user_id', user.id)
      .single();

    const isPremium = !!profile?.is_premium;
    el.style.display = isPremium ? 'inline-flex' : 'none';
    el.setAttribute('data-premium', isPremium ? 'true' : 'false');
    el.style.alignItems = 'center';
    el.style.gap = '0.35rem';
    el.title = isPremium ? 'Premium user' : '';
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
