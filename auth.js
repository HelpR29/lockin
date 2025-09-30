// Supabase Configuration
// IMPORTANT: Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., 'https://xyzcompany.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if user is already logged in
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // User is logged in
        const currentPage = window.location.pathname;
        if (currentPage.includes('signup.html') || currentPage.includes('login.html')) {
            window.location.href = 'dashboard.html';
        }
    }
    
    return user;
}

// Sign Up Function
async function signUp(email, password, fullName) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });

        if (error) throw error;

        // Show success message
        alert('Account created successfully! Please check your email to verify your account.');
        
        // Redirect to login or dashboard
        window.location.href = 'login.html';
        
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
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Redirect to dashboard
        window.location.href = 'dashboard.html';
        
        return data;
    } catch (error) {
        console.error('Error signing in:', error);
        alert(error.message || 'Invalid email or password.');
        return null;
    }
}

// Sign Out Function
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out. Please try again.');
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
    checkAuth();
});
