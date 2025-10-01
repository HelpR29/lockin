// Feature flag utilities for plans and gating

async function getUserPlanAndFeatures() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { plan: 'free', features: {} };

    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('plan_code, status, is_lifetime, expires_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const planCode = sub?.plan_code || 'free';

    const { data: features } = await supabase
      .from('plan_features')
      .select('feature_key, enabled')
      .eq('plan_code', planCode);

    const flags = {};
    (features || []).forEach(f => { flags[f.feature_key] = !!f.enabled; });
    return { plan: planCode, features: flags };
  } catch (error) {
    console.error('Error getting user plan and features:', error);
    return { plan: 'free', features: {} };
  }
}

async function assertFeature(featureKey, onDenied) {
  try {
    const { features } = await getUserPlanAndFeatures();
    if (!features[featureKey]) {
      if (typeof onDenied === 'function') onDenied();
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking feature access:', error);
    if (typeof onDenied === 'function') onDenied();
    return false;
  }
}

// Expose to global
window.getUserPlanAndFeatures = getUserPlanAndFeatures;
window.assertFeature = assertFeature;
