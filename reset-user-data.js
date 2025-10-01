// Reset User Data - Run this in browser console to clean up all data for current user

async function resetUserData() {
    console.log('🧹 Starting User Data Reset...\n');

    try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('❌ Not logged in or error:', userError);
            return;
        }

        console.log('✅ Current User:', user.email);
        const userId = user.id;

        // Confirm deletion
        const confirmDelete = confirm(`⚠️ This will DELETE ALL data for user: ${user.email}\n\nThis includes:\n- Profile data\n- Goals\n- Progress\n- Trades\n- Rules\n- Achievements\n\nThis cannot be undone!\n\nType 'DELETE' to confirm:`);

        if (confirmDelete !== 'DELETE') {
            console.log('❌ Reset cancelled by user');
            return;
        }

        console.log('🗑️ Deleting user data...');

        // Delete in reverse dependency order
        const tablesToDelete = [
            'rule_violations',
            'beer_spills',
            'beer_completions',
            'trades',
            'user_achievements',
            'daily_check_ins',
            'trading_rules',
            'user_defined_rules',
            'user_progress',
            'user_goals',
            'user_profiles'
        ];

        let deletedRecords = 0;

        for (const table of tablesToDelete) {
            try {
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .eq('user_id', userId);

                if (error) {
                    console.warn(`⚠️ Error deleting from ${table}:`, error.message);
                } else {
                    console.log(`✅ Cleared ${table}`);
                    deletedRecords++;
                }
            } catch (err) {
                console.warn(`⚠️ Failed to delete from ${table}:`, err.message);
            }
        }

        console.log(`\n🎉 Reset Complete!`);
        console.log(`📊 Records deleted: ${deletedRecords}`);
        console.log(`🔄 You can now run onboarding again from scratch`);

        // Optional: Sign out and redirect to start fresh
        const signOutAfterReset = confirm('Sign out and start fresh?');
        if (signOutAfterReset) {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        }

    } catch (error) {
        console.error('❌ Reset Error:', error);
    }
}

// Make it globally available
window.resetUserData = resetUserData;
