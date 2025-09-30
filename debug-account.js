// Debug Account Status - Run this in browser console

async function debugAccountStatus() {
    console.log('🔍 Starting Account Debug...\n');
    
    try {
        // 1. Check current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.error('❌ Not logged in or error:', userError);
            return;
        }
        
        console.log('✅ Current User:');
        console.log('  - ID:', user.id);
        console.log('  - Email:', user.email);
        console.log('  - Full Name (metadata):', user.user_metadata?.full_name || 'NOT SET');
        console.log('  - Created:', new Date(user.created_at).toLocaleString());
        console.log('  - Raw Metadata:', user.user_metadata);
        console.log('');
        
        // 2. Check user_profiles
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        console.log('📋 User Profile:');
        if (profileError) {
            console.warn('  ⚠️ No profile found:', profileError.message);
        } else {
            console.log('  - Username:', profile?.username || 'NOT SET');
            console.log('  - Avatar:', profile?.avatar || 'NOT SET');
            console.log('  - Onboarding Complete:', profile?.onboarding_completed);
        }
        console.log('');
        
        // 3. Check user_goals
        const { data: goals, error: goalsError } = await supabase
            .from('user_goals')
            .select('*')
            .eq('user_id', user.id);
        
        console.log('🎯 User Goals:');
        if (goalsError) {
            console.warn('  ⚠️ No goals found:', goalsError.message);
        } else {
            console.log('  - Goals Found:', goals?.length || 0);
            if (goals && goals.length > 0) {
                console.log('  - Starting Capital:', goals[0].starting_capital);
                console.log('  - Current Capital:', goals[0].current_capital);
            }
        }
        console.log('');
        
        // 4. Check user_progress
        const { data: progress, error: progressError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        console.log('📊 User Progress:');
        if (progressError) {
            console.warn('  ⚠️ No progress found:', progressError.message);
        } else {
            console.log('  - Level:', progress?.level || 1);
            console.log('  - Total XP:', progress?.total_check_ins || 0);
            console.log('  - Glasses Cracked:', progress?.beers_cracked || 0);
        }
        console.log('');
        
        // 5. Check trades
        const { data: trades, error: tradesError } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', user.id);
        
        console.log('📝 Trades:');
        if (tradesError) {
            console.warn('  ⚠️ Error loading trades:', tradesError.message);
        } else {
            console.log('  - Total Trades:', trades?.length || 0);
            const openTrades = trades?.filter(t => t.status === 'open').length || 0;
            const closedTrades = trades?.filter(t => t.status === 'closed').length || 0;
            console.log('  - Open:', openTrades);
            console.log('  - Closed:', closedTrades);
        }
        console.log('');
        
        // 6. Check trading rules
        const { data: rules, error: rulesError } = await supabase
            .from('trading_rules')
            .select('*')
            .eq('user_id', user.id);
        
        console.log('📋 Trading Rules:');
        if (rulesError) {
            console.warn('  ⚠️ Error loading rules:', rulesError.message);
        } else {
            console.log('  - Total Rules:', rules?.length || 0);
            const activeRules = rules?.filter(r => r.is_active).length || 0;
            console.log('  - Active:', activeRules);
            if (rules && rules.length > 0) {
                console.log('  - Categories:', [...new Set(rules.map(r => r.category))].join(', '));
            }
        }
        console.log('');
        
        // 7. Check rule violations
        const { data: violations, error: violationsError } = await supabase
            .from('rule_violations')
            .select('*')
            .eq('user_id', user.id);
        
        console.log('⚠️ Rule Violations:');
        if (violationsError) {
            console.warn('  ⚠️ Error loading violations:', violationsError.message);
        } else {
            console.log('  - Total Violations:', violations?.length || 0);
        }
        console.log('');
        
        // 8. Recommendations
        console.log('💡 Recommendations:');
        if (!user.user_metadata?.full_name) {
            console.log('  ❌ Run fix_user_metadata.sql to set full_name to "Dianne"');
        }
        if (!profile || !profile.username) {
            console.log('  ❌ Complete onboarding to set up profile');
        }
        if (!rules || rules.length === 0) {
            console.log('  ❌ Rules not initialized - run onboarding or manually add rules');
        }
        if (!trades || trades.length === 0) {
            console.log('  ⚠️ No trades logged yet');
        }
        
    } catch (error) {
        console.error('❌ Debug Error:', error);
    }
}

// Auto-run on page load
if (typeof supabase !== 'undefined') {
    console.log('🔧 Debug script loaded. Run: debugAccountStatus()');
    // Auto-run
    debugAccountStatus();
} else {
    console.error('❌ Supabase not loaded');
}

window.debugAccountStatus = debugAccountStatus;
