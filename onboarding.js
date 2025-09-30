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
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    if (profile && profile.onboarding_completed) {
        window.location.href = 'dashboard.html';
    }
});

// Navigation Functions
function nextStep() {
    if (currentStep < totalSteps) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        currentStep++;
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgress();
    }
}

function prevStep() {
    if (currentStep > 1) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        currentStep--;
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgress();
    }
}

function updateProgress() {
    const progress = (currentStep / totalSteps) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('currentStep').textContent = currentStep;
}

// Step 2: Save Profile
async function saveProfile() {
    const form = document.getElementById('profileForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    onboardingData.profile = {
        experience: document.getElementById('experience').value,
        trading_style: document.getElementById('tradingStyle').value,
        markets: document.getElementById('markets').value
    };
    
    nextStep();
}

// Step 3: Save Goals & Calculate Projection
function calculateProjection() {
    const starting = parseFloat(document.getElementById('startingCapital').value) || 0;
    const percentPerBeer = parseFloat(document.getElementById('targetPercentPerBeer').value) || 0;
    const totalBottles = parseInt(document.getElementById('totalBottles').value) || 0;
    
    if (starting > 0 && percentPerBeer > 0 && totalBottles > 0) {
        const multiplier = 1 + (percentPerBeer / 100);
        const finalValue = starting * Math.pow(multiplier, totalBottles);
        
        document.getElementById('goalPreview').style.display = 'block';
        document.getElementById('projectedValue').textContent = `$${finalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
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
    if (!form.checkValidity()) {
        form.reportValidity();
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
    if (!form.checkValidity()) {
        form.reportValidity();
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
    selectedElement.classList.add('selected');
    
    selectedToken = token;
    onboardingData.token = token;
    
    // Enable finish button
    document.getElementById('finishButton').disabled = false;
}

// Complete Onboarding
async function completeOnboarding() {
    if (!selectedToken) {
        alert('Please select a progress token');
        return;
    }
    
    const button = document.getElementById('finishButton');
    const buttonText = button.querySelector('span');
    buttonText.textContent = 'Saving...';
    button.disabled = true;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Save all onboarding data to Supabase
        const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
                user_id: user.id,
                experience: onboardingData.profile.experience,
                trading_style: onboardingData.profile.trading_style,
                markets: onboardingData.profile.markets,
                progress_token: onboardingData.token,
                onboarding_completed: true,
                created_at: new Date().toISOString()
            });
        
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
                created_at: new Date().toISOString()
            });
        
        if (goalsError) throw goalsError;
        
        // Save trading rules
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
                created_at: new Date().toISOString()
            });
        
        if (rulesError) throw rulesError;
        
        // Initialize user progress system
        const { error: progressError } = await supabase
            .from('user_progress')
            .insert({
                user_id: user.id,
                completions: 0,
                streak: 0,
                longest_streak: 0,
                discipline_score: 0,
                level: 1,
                experience: 0,
                next_level_xp: 100,
                current_progress_object: onboardingData.token,
                total_check_ins: 0,
                streak_multiplier: 1.0,
                level_bonus: 1.0,
                achievement_bonus: 1.0,
                total_growth_multiplier: 1.0
            });
        
        if (progressError) console.warn('Progress init warning:', progressError);
        
        // Success! Redirect to dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Error saving onboarding data:', error);
        alert('Error saving your settings. Please try again.');
        buttonText.textContent = 'Complete Setup';
        button.disabled = false;
    }
}
