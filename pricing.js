// Simple write-through pricing selection (no payments backend yet)

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const user = await checkAuth();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
  } catch (error) {
    console.error('Error during authentication check:', error);
    window.location.href = 'login.html';
  }
});

async function selectPlan(planCode) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Please log in first.');
      window.location.href = 'login.html';
      return;
    }
    
    if (!planCode) {
      alert('Invalid plan selected.');
      return;
    }

  // Compute expiry (for subscriptions), lifetime has null
  let expiresAt = null;
  if (planCode === 'premium_monthly') {
    expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else if (planCode === 'premium_yearly') {
    expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  const payload = {
    user_id: user.id,
    plan_code: planCode,
    status: 'active',
    is_lifetime: planCode === 'lifetime',
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  // Upsert latest subscription by replacing existing rows for this user
  const { error: delErr } = await supabase
    .from('user_subscriptions')
    .delete()
    .eq('user_id', user.id);
  if (delErr) {
    console.warn('Could not clear existing subs, proceeding to insert new');
  }

  const { error } = await supabase
    .from('user_subscriptions')
    .insert(payload);

  if (error) {
    console.error('Error upgrading plan:', error);
    alert('Could not update your plan. Please try again.');
    return;
  }

    alert('Plan updated successfully!');
    window.location.href = 'reports.html';
  } catch (error) {
    console.error('Error selecting plan:', error);
    alert('An error occurred. Please try again.');
  }
}

// Export function to global scope for HTML onclick handlers
window.selectPlan = selectPlan;
