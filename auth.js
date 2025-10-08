// Supabase Configuration
// IMPORTANT: Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://wdxxsldarfahwvzinjgt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkeHhzbGRhcmZhaHd2emluamd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxOTgyNzcsImV4cCI6MjA3NDc3NDI3N30.rzAm83U4i5yjQjPdEus-tw0mm5txy7OKt1YrIeojF2s';

// Initialize Supabase client
// Initialize with defaults; supabase-js will call `${SUPABASE_URL}/functions/v1` for Edge Functions
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Make supabase globally available
window.supabase = supabase;
// Helpers for direct calls if needed
window.SUPABASE_FUNCTIONS_URL = SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co');
window.SUPABASE_URL = SUPABASE_URL;

// Check if user is already logged in
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Auth check error:', error);
            return null;
        }
        
        if (user) {
            // User is logged in
            const currentPage = window.location.pathname;
            if (currentPage.includes('signup.html') || currentPage.includes('login.html')) {
                // Decide destination by onboarding status
                let onboarded = false;
                try {
                    const { data: prof } = await supabase
                        .from('user_profiles')
                        .select('onboarding_completed')
                        .eq('user_id', user.id)
                        .single();
                    onboarded = !!prof?.onboarding_completed;
                } catch (_) { onboarded = false; }
                window.location.href = onboarded ? 'dashboard.html' : 'onboarding.html';
            }
        }
        
        return user;
    } catch (error) {
        console.error('Unexpected auth check error:', error);
        return null;
    }
}

// Sign Up Function
async function signUp(email, password, fullName) {
    try {
        if (!email || !password) {
            alert('Email and password are required.');
            return null;
        }
        
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });

        if (error) throw error;

        // Check if email confirmation is required
        if (data.user && !data.session) {
            // Email confirmation required
            alert('Account created! Please check your email and click the confirmation link to verify your account before logging in.');
            window.location.href = 'login.html';
            return data;
        }
        
        // If session exists, user is already logged in (no email confirmation required)
        alert('Account created successfully!');
        window.location.href = 'onboarding.html';
        
        return data;
    } catch (error) {
        console.error('Error signing up:', error);
        alert(error.message || 'Error creating account. Please try again.');
        return null;
    }
}

// Sign In Function
async function signIn(email, password) {
    try {
        if (!email || !password) {
            alert('Email and password are required.');
            return null;
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
        });

        if (error) throw error;

        // Check if user has completed onboarding
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('onboarding_completed')
            .eq('user_id', data.user.id)
            .single();
        
        // Redirect based on onboarding status
        if (profile && profile.onboarding_completed) {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'onboarding.html';
        }
        
        return data;
    } catch (error) {
        console.error('Error signing in:', error);
        
        // Provide more helpful error messages
        let errorMessage = error.message || 'Invalid email or password.';
        
        if (error.message?.includes('Email not confirmed')) {
            errorMessage = 'Please verify your email address before logging in. Check your inbox for the confirmation link.';
        } else if (error.message?.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. If you just signed up, please check your email to verify your account first.';
        }
        
        alert(errorMessage);
        return null;
    }
}

// Sign Out Function
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Clear any local storage/session storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear any cached user data
        if (typeof window.clearUserCache === 'function') {
            window.clearUserCache();
        }
        
        // Clear any global user-related variables
        if (typeof window.currentUser !== 'undefined') {
            window.currentUser = null;
        }
        if (typeof window.userProgress !== 'undefined') {
            window.userProgress = null;
        }
        
        // Force complete page reload to prevent any cached data
        window.location.reload();
        
        // Fallback redirect if reload doesn't work
        setTimeout(() => {
            window.location.replace('/index.html');
        }, 100);
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out. Please try again.');
        // Even if there's an error, try to redirect
        window.location.replace('/index.html');
    }
}

// Password Reset Function
async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`,
        });

        if (error) throw error;

        alert('Password reset email sent! Please check your inbox.');
        return true;
    } catch (error) {
        console.error('Error resetting password:', error);
        alert(error.message || 'Error sending reset email.');
        return false;
    }
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    
    if (event === 'SIGNED_IN') {
        console.log('User signed in:', session.user);
    } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
    }
});

// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth().catch(err => console.error('Auth initialization error:', err));
});

// Export functions to global scope for HTML forms
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.resetPassword = resetPassword;
window.checkAuth = checkAuth;
