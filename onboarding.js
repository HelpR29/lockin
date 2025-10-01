// Onboarding State Management
let currentStep = 1;
const totalSteps = 5;
let selectedToken = null;

// Onboarding data
const onboardingData = {
    profile: {},
    goals: {},
    rules: {},
    token: null
};

// Check auth on load
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Check if user has already completed onboarding
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    // If profile doesn't exist or there's an error, user needs to complete onboarding
    if (profileError || !profile) {
        console.log('No profile found or error fetching profile, user needs onboarding');
        return; // Stay on onboarding page
    }
    
    // If profile exists but onboarding is not completed, also stay on onboarding
    if (profile && !profile.onboarding_completed) {
        console.log('Profile exists but onboarding not completed, continuing onboarding');
        return; // Stay on onboarding page
    }
    
    // Only redirect to dashboard if onboarding is fully completed
    if (profile && profile.onboarding_completed) {
        console.log('Onboarding already completed, redirecting to dashboard');
        window.location.href = 'dashboard.html';
    }
});

// Navigation Functions
function nextStep() {
    if (currentStep < totalSteps) {
        const currentStepEl = document.getElementById(`step${currentStep}`);
        const nextStepEl = document.getElementById(`step${currentStep + 1}`);
        
        if (currentStepEl) currentStepEl.classList.remove('active');
        currentStep++;
        if (nextStepEl) nextStepEl.classList.add('active');
        updateProgress();
    }
}

function prevStep() {
    if (currentStep > 1) {
        const currentStepEl = document.getElementById(`step${currentStep}`);
        const prevStepEl = document.getElementById(`step${currentStep - 1}`);
        
        if (currentStepEl) currentStepEl.classList.remove('active');
        currentStep--;
        if (prevStepEl) prevStepEl.classList.add('active');
        updateProgress();
    }
}

function updateProgress() {
    const progress = (currentStep / totalSteps) * 100;
    const progressFill = document.getElementById('progressFill');
    const currentStepEl = document.getElementById('currentStep');
    
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (currentStepEl) currentStepEl.textContent = currentStep;
}

// Avatar selection
let selectedAvatar = '';
function selectAvatar(emoji) {
    // Remove previous selection
    document.querySelectorAll('.profile-pic-option').forEach(el => {
        el.style.border = '2px solid transparent';
        el.style.background = 'rgba(255, 149, 0, 0.1)';
    });
    
    // Highlight selected avatar
    const selectedEl = document.querySelector(`[data-avatar="${emoji}"]`);
    if (selectedEl) {
        selectedEl.style.border = '2px solid var(--primary)';
        selectedEl.style.background = 'rgba(255, 149, 0, 0.3)';
    }
    
    selectedAvatar = emoji;
    document.getElementById('profileAvatar').value = emoji;
}

// Step 2: Save Profile
async function saveProfile() {
    const form = document.getElementById('profileForm');
    if (!form || !form.checkValidity()) {
        if (form) form.reportValidity();
        return;
    }
    
    if (!selectedAvatar) {
        alert('Please select a profile picture!');
        return;
    }
    
    onboardingData.profile = {
        username: document.getElementById('username').value.trim(),
        avatar: selectedAvatar,
        gender: document.getElementById('gender').value,
        experience: document.getElementById('experience').value,
        trading_style: document.getElementById('tradingStyle').value,
        markets: document.getElementById('markets').value
    };
    
    nextStep();
}

// Step 3: Save Goals & Calculate Projection
function calculateProjection() {
    const startingCapitalEl = document.getElementById('startingCapital');
    const targetPercentEl = document.getElementById('targetPercentPerBeer');
    const totalBottlesEl = document.getElementById('totalBottles');
    
    if (!startingCapitalEl || !targetPercentEl || !totalBottlesEl) return;
    
    const starting = parseFloat(startingCapitalEl.value) || 0;
    const percentPerBeer = parseFloat(targetPercentEl.value) || 0;
    const totalBottles = parseInt(totalBottlesEl.value) || 0;
    
    if (starting > 0 && percentPerBeer > 0 && totalBottles > 0) {
        const multiplier = 1 + (percentPerBeer / 100);
        const finalValue = starting * Math.pow(multiplier, totalBottles);
        
        const goalPreviewEl = document.getElementById('goalPreview');
        const projectedValueEl = document.getElementById('projectedValue');
        
        if (goalPreviewEl) goalPreviewEl.style.display = 'block';
        if (projectedValueEl) projectedValueEl.textContent = `$${finalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    }
}

// Add event listeners for goal inputs
document.addEventListener('DOMContentLoaded', () => {
    ['startingCapital', 'targetPercentPerBeer', 'totalBottles'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', calculateProjection);
        }
    });
});

async function saveGoals() {
    const form = document.getElementById('goalsForm');
    if (!form || !form.checkValidity()) {
        if (form) form.reportValidity();
        return;
    }
    
    onboardingData.goals = {
        starting_capital: parseFloat(document.getElementById('startingCapital').value),
        total_bottles: parseInt(document.getElementById('totalBottles').value),
        target_percent_per_beer: parseFloat(document.getElementById('targetPercentPerBeer').value),
        max_loss_percent: parseFloat(document.getElementById('maxLossPercent').value)
    };
    
    nextStep();
}

// Step 4: Save Rules
async function saveRules() {
    const form = document.getElementById('rulesForm');
    if (!form || !form.checkValidity()) {
        if (form) form.reportValidity();
        return;
    }
    
    onboardingData.rules = {
        max_risk_per_trade: parseFloat(document.getElementById('maxRiskPerTrade').value),
        max_daily_loss: parseFloat(document.getElementById('maxDailyLoss').value),
        max_trades_per_day: parseInt(document.getElementById('maxTradesPerDay').value),
        min_win_rate: parseFloat(document.getElementById('minWinRate').value),
        require_journal: document.getElementById('requireJournal').checked
    };
    
    nextStep();
}

// Step 5: Select Token
function selectToken(token) {
    // Remove previous selection
    document.querySelectorAll('.token-option').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to clicked token
    const selectedElement = document.querySelector(`[data-token="${token}"]`);
    if (selectedElement) selectedElement.classList.add('selected');
    
    selectedToken = token;
    onboardingData.token = token;
    
    // Enable finish button
    const finishButton = document.getElementById('finishButton');
    if (finishButton) finishButton.disabled = false;
}

// Complete Onboarding
async function completeOnboarding() {
    if (!selectedToken) {
        alert('Please select a progress token');
        return;
    }
    
    const button = document.getElementById('finishButton');
    const buttonText = button?.querySelector('span');
    if (buttonText) buttonText.textContent = 'Saving...';
    if (button) button.disabled = true;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Validate all data exists
        if (!onboardingData.profile || !onboardingData.goals || !onboardingData.rules || !onboardingData.token) {
            throw new Error('Please complete all steps before finishing setup.');
        }
        
        console.log('Saving onboarding data:', onboardingData);
        
        // Clean up any existing incomplete records first
        try {
            // Delete any existing incomplete user_profiles record
            await supabase
                .from('user_profiles')
                .delete()
                .eq('user_id', user.id)
                .eq('onboarding_completed', false);
            
            // Delete any existing user_goals record (in case of incomplete onboarding)
            await supabase
                .from('user_goals')
                .delete()
                .eq('user_id', user.id);
                
            // Delete any existing trading_rules record (in case of incomplete onboarding)
            await supabase
                .from('trading_rules')
                .delete()
                .eq('user_id', user.id);
                
            // Delete any existing user_progress record (in case of incomplete onboarding)
            await supabase
                .from('user_progress')
                .delete()
                .eq('user_id', user.id);
                
            console.log('✅ Cleaned up any existing incomplete records');
        } catch (cleanupError) {
            console.log('Cleanup warning (non-critical):', cleanupError);
        }
        
        // Update auth user metadata with full name
        await supabase.auth.updateUser({
            data: {
                full_name: onboardingData.profile.username
            }
        });
        
        // Save all onboarding data to Supabase
        const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert(
                {
                    user_id: user.id,
                    username: onboardingData.profile.username,
                    avatar: onboardingData.profile.avatar || '👤',
                    gender: onboardingData.profile.gender || 'prefer-not-to-say',
                    experience: onboardingData.profile.experience,
                    trading_style: onboardingData.profile.trading_style,
                    markets: onboardingData.profile.markets,
                    progress_token: onboardingData.token,
                    onboarding_completed: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: 'user_id',
                    ignoreDuplicates: false
                }
            );
        
        if (profileError) throw profileError;
        
        // Save goals (Beer System)
        const { error: goalsError } = await supabase
            .from('user_goals')
            .insert({
                user_id: user.id,
                starting_capital: onboardingData.goals.starting_capital,
                current_capital: onboardingData.goals.starting_capital,
                target_percent_per_beer: onboardingData.goals.target_percent_per_beer,
                total_bottles: onboardingData.goals.total_bottles,
                bottles_remaining: onboardingData.goals.total_bottles,
                bottles_cracked: 0,
                max_loss_percent: onboardingData.goals.max_loss_percent,
                beers_spilled: 0,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        if (goalsError) throw goalsError;
        
        // Save trading rules (skip this step if column doesn't exist)
        try {
            const { error: rulesError } = await supabase
                .from('trading_rules')
                .insert({
                    user_id: user.id,
                    max_risk_per_trade: onboardingData.rules.max_risk_per_trade,
                    max_daily_loss: onboardingData.rules.max_daily_loss,
                    max_trades_per_day: onboardingData.rules.max_trades_per_day,
                    min_win_rate: onboardingData.rules.min_win_rate,
                    require_journal: onboardingData.rules.require_journal,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (rulesError) throw rulesError;
            console.log('✅ Trading rules saved successfully');
        } catch (rulesError) {
            console.warn('⚠️ Could not save trading rules (column may not exist yet):', rulesError.message);
            // Continue with onboarding even if trading rules fail
        }
        
        // Initialize user progress system (Beer System)
        const { error: progressError } = await supabase
            .from('user_progress')
            .upsert(
                {
                    user_id: user.id,
                    beers_cracked: 0,
                    beers_spilled: 0,
                    streak: 0,
                    longest_streak: 0,
                    discipline_score: 0,
                    level: 1,
                    experience: 0,
                    next_level_xp: 100,
                    progress_token: onboardingData.token,
                    streak_multiplier: 1.0,
                    level_bonus: 1.0,
                    achievement_bonus: 1.0,
                    total_growth_multiplier: 1.0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: 'user_id',
                    ignoreDuplicates: false
                }
            );
            
            if (progressError) console.warn('Progress init warning:', progressError);
            
            // Step 4: Initialize default trading rules
            await initializeDefaultTradingRules(user.id);
            
            console.log('✅ Onboarding complete! Redirecting to dashboard...');
            
            // Show success message
            const button = document.getElementById('finishButton');
            const buttonText = button?.querySelector('span');
            if (buttonText) buttonText.textContent = '✅ Complete!';
            
            // Show success overlay
            showOnboardingSuccess();
            
            // Redirect to dashboard after showing success
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 4000); // Increased to 4 seconds to see success message clearly
        } catch (error) {
            console.error('Error saving onboarding data:', error);
            console.error('Error details:', error.message);
            console.error('Current data:', onboardingData);
            
            let errorMsg = 'Error saving your settings. ';
            if (error.message) {
                errorMsg += error.message;
            } else {
                errorMsg += 'Please try again.';
            }
            
            alert(errorMsg);
            if (buttonText) buttonText.textContent = 'Complete Setup';
            if (button) button.disabled = false;
        }
    }
}

// Show onboarding success message
function showOnboardingSuccess() {
    // Create success overlay
    const successOverlay = document.createElement('div');');
    successOverlay.id = 'onboardingSuccess';
    successOverlay.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.5s ease-out;
        ">
            <div style="
                background: var(--card-bg);
                border: 2px solid var(--success, #4CAF50);
                border-radius: 20px;
                padding: 3rem;
                text-align: center;
                max-width: 500px;
                animation: slideUp 0.5s ease-out;
            ">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                <h2 style="color: var(--success, #4CAF50); margin-bottom: 1rem;">Setup Complete!</h2>
                <p style="margin-bottom: 1rem;">Welcome to LockIn! Your trading discipline journey begins now.</p>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">
                    Redirecting to your dashboard in 4 seconds...
                </p>
                <div style="
                    margin-top: 1.5rem;
                    width: 100%;
                    height: 4px;
                    background: var(--surface);
                    border-radius: 2px;
                    overflow: hidden;
                ">
                    <div style="
                        width: 100%;
                        height: 100%;
                        background: var(--primary);
                        animation: progressBar 4s linear;
                    "></div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(successOverlay);
    
    // Add CSS animations if not already present
    if (!document.querySelector('#onboarding-success-styles')) {
        const style = document.createElement('style');
        style.id = 'onboarding-success-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes progressBar {
                from { width: 100%; }
                to { width: 0%; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize default trading rules
async function initializeDefaultTradingRules(userId) {
    const defaultRules = [
        { category: "Risk Management", rule: "Never risk more than 2% of account per trade" },
        { category: "Risk Management", rule: "Always use stop loss orders" },
        { category: "Risk Management", rule: "Don't add to losing positions" },
        { category: "Risk Management", rule: "Maximum 3 open positions at once" },
        { category: "Entry Rules", rule: "Wait for confirmation before entering" },
        { category: "Entry Rules", rule: "Only trade during market hours (9:30 AM - 4:00 PM)" },
        { category: "Entry Rules", rule: "No trading in first/last 15 minutes of market" },
        { category: "Entry Rules", rule: "Must have 3:1 reward-to-risk ratio minimum" },
        { category: "Exit Rules", rule: "Take profits at predetermined targets" },
        { category: "Exit Rules", rule: "Move stop to breakeven after 50% profit" },
        { category: "Exit Rules", rule: "Exit immediately if thesis is invalidated" },
        { category: "Exit Rules", rule: "Don't hold overnight unless planned" },
        { category: "Psychology", rule: "No revenge trading after a loss" },
        { category: "Psychology", rule: "Take a break after 2 consecutive losses" },
        { category: "Psychology", rule: "Don't trade when emotional or stressed" },
        { category: "Psychology", rule: "Journal every trade with emotions" },
        { category: "General", rule: "Follow the trading plan always" },
        { category: "General", rule: "Review trades weekly" },
        { category: "General", rule: "No FOMO trading" },
        { category: "General", rule: "Keep risk-reward ratio consistent" }
    ];
    
    try {
        for (const ruleData of defaultRules) {
            await supabase.from('trading_rules').insert({
                user_id: userId,
                rule: ruleData.rule,
                category: ruleData.category,
                is_active: true
            });
        }
        console.log('✅ Default trading rules initialized');
    } catch (error) {
        console.error('Error initializing default rules:', error);
    }
}

// Export functions to global scope for HTML onclick handlers
window.selectAvatar = selectAvatar;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.saveProfile = saveProfile;
window.saveGoals = saveGoals;
window.saveRules = saveRules;
window.selectToken = selectToken;
window.completeOnboarding = completeOnboarding;
window.nextStep = nextStep;
window.prevStep = prevStep;
