// Feature flag utilities for plans and gating

async function getUserPlanAndFeatures() {
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
}

async function assertFeature(featureKey, onDenied) {
  const { features } = await getUserPlanAndFeatures();
  if (!features[featureKey]) {
    if (typeof onDenied === 'function') onDenied();
    return false;
  }
  return true;
}

// Expose to global
window.getUserPlanAndFeatures = getUserPlanAndFeatures;
window.assertFeature = assertFeature;
