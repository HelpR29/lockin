// Onboarding State Management
let currentStep = 1;
const totalSteps = 7;
let selectedToken = null;
let selectedRules = [];
let totalRulesAvailable = 0;
// Active tab/category for step 6 (rules)
let activeRuleCategory = 'Risk Management';
// Checklist items for step 7
let checklistItems = [];

// Onboarding data
const onboardingData = {
    profile: {},
    goals: {},
    rules: {},
    token: null,
    tradingRules: []
};

// Wait for Supabase user/session to be ready (prevents bounce to login)
async function waitForUser(timeoutMs = 3000) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) return user;
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) return sessionData.session.user;
    } catch (_) {}
    return new Promise(resolve => {
        let done = false;
        const timer = setTimeout(() => { if (!done) { done = true; resolve(null); } }, timeoutMs);
        try {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
                if (!done && session?.user) {
                    done = true;
                    clearTimeout(timer);
                    try { subscription.unsubscribe(); } catch (_) {}
                    resolve(session.user);
                }
            });
        } catch (_) {}
    });
}

// Check auth on load (resilient)
document.addEventListener('DOMContentLoaded', async () => {
    const user = await waitForUser(3500);
    if (!user) {
        // No session after grace period → go to login
        window.location.href = 'login.html';
        return;
    }

    // Check if user has already completed onboarding
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    // If we are in a forced onboarding state (after reset), do NOT redirect away even if a stale
    // profile shows onboarding_completed=true. This guarantees the user remains on onboarding.
    const forceOnboarding = (localStorage.getItem('lockin_reset_used') === '1');
    if (forceOnboarding) {
        console.log('Forced onboarding active (post-reset). Staying on onboarding.');
        // Best effort: mark profile as not completed to keep routing consistent elsewhere
        try {
            await supabase.from('user_profiles').upsert({ user_id: user.id, onboarding_completed: false }, { onConflict: 'user_id', ignoreDuplicates: false });
        } catch (_) { /* non-fatal */ }
        return; // Stay on onboarding page
    }

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

// Render preset avatars on load and when gender changes
document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        try {
            await loadAvatarManifest();
            renderPresetAvatars();
            const genderEl = document.getElementById('gender');
            if (genderEl && !genderEl.__lockinBound) {
                genderEl.addEventListener('change', renderPresetAvatars);
                genderEl.__lockinBound = true;
            }
        } catch (_) { /* no-op */ }
    })();
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
        
        // Load rules when entering step 6
        if (currentStep === 6) {
            loadRulesForSelection();
        }
        // Load checklist when entering step 7
        if (currentStep === 7) {
            renderChecklistItems();
        }
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

// ---- Step 6 Tab Helpers ----
function getActiveCategory() {
    const activeTab = document.querySelector('#ruleTabs .rule-tab.active');
    return activeTab?.getAttribute('data-category') || activeRuleCategory || 'Risk Management';
}

function showRuleCategory(category) {
    activeRuleCategory = category || getActiveCategory();
    document.querySelectorAll('.rule-category-panel').forEach(panel => {
        const cat = panel.getAttribute('data-category');
        panel.style.display = (cat === activeRuleCategory) ? 'block' : 'none';
    });
}

// Delegate tab clicks (works when step 6 becomes active)
document.addEventListener('click', (e) => {
    const tab = e.target.closest('#ruleTabs .rule-tab');
    if (!tab) return;
    const category = tab.getAttribute('data-category');
    showRuleCategory(category);
});

// Avatar selection
let selectedAvatar = '';
let selectedAvatarUrl = '';
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
    // If user picks an emoji, clear any preset photo selection
    selectedAvatarUrl = '';
    onboardingData.profile = { ...(onboardingData.profile || {}), avatar_url: '' };
}

// Preset avatars list (fallback values if no manifest is present)
const PRESET_AVATARS = {
    male: [
        'assets/avatars/male.png'
        // Add more e.g., 'assets/avatars/male2.png', 'assets/avatars/male3.png'
    ],
    female: [
        'assets/avatars/female.png'
        // Add more e.g., 'assets/avatars/female2.png', 'assets/avatars/female3.png'
    ]
};

// Try to load a manifest with full lists (assets/avatars/manifest.json)
async function loadAvatarManifest() {
    try {
        const resp = await fetch('assets/avatars/manifest.json', { cache: 'no-cache' });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data && (Array.isArray(data.male) || Array.isArray(data.female))) {
            if (Array.isArray(data.male)) PRESET_AVATARS.male = data.male;
            if (Array.isArray(data.female)) PRESET_AVATARS.female = data.female;
        }
    } catch (_) { /* ignore if manifest missing */ }
}

function renderPresetAvatars() {
    const gallery = document.getElementById('presetAvatarGallery');
    if (!gallery) return;
    const genderEl = document.getElementById('gender');
    const g = (genderEl?.value || '').toLowerCase();
    let list = [];
    if (g === 'male') list = PRESET_AVATARS.male;
    else if (g === 'female') list = PRESET_AVATARS.female;
    else list = [...(PRESET_AVATARS.male || []), ...(PRESET_AVATARS.female || [])];
    gallery.innerHTML = (list || []).map(url => `
        <div class="preset-avatar-item ${selectedAvatarUrl===url ? 'preset-selected' : ''}" data-url="${url}" role="button" tabindex="0" onclick="onPresetAvatarClick(event)">
            <img src="${url}" alt="avatar" style="width:100%; height:100%; object-fit:cover; display:block;"/>
        </div>
    `).join('');
    // Event delegation (prevents rebinding and flicker)
    if (!gallery.__lockinBound) {
        gallery.addEventListener('click', (e) => {
            const item = e.target.closest('.preset-avatar-item');
            if (!item) return;
            const url = item.getAttribute('data-url');
            selectPresetAvatar(url);
        });
        gallery.__lockinBound = true;
    }
    updateSelectedHighlight();
    updateAvatarPreview(selectedAvatarUrl);
}

function selectPresetAvatar(url) {
    selectedAvatarUrl = url;
    // Clear emoji selection (keep the hidden emoji if already set, but photo will take precedence)
    onboardingData.profile = { ...(onboardingData.profile || {}), avatar_url: url };
    updateAvatarPreview(url);
    updateSelectedHighlight();
}

function updateAvatarPreview(url) {
    const preview = document.getElementById('avatarLivePreview');
    const stepIcon = document.querySelector('#step2 .step-icon');
    if (url) {
        if (preview) preview.innerHTML = `<img src="${url}" alt="avatar" style="width:100%; height:100%; object-fit:cover; display:block;"/>`;
        if (stepIcon) stepIcon.innerHTML = `<img src="${url}" alt="avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;"/>`;
    } else {
        if (preview) preview.innerHTML = `<span style="font-size:2.25rem;">👤</span>`;
        if (stepIcon) stepIcon.innerHTML = '👤';
    }
}

// Fallback inline click handler used by rendered items
function onPresetAvatarClick(e) {
    const item = e.currentTarget || e.target.closest('.preset-avatar-item');
    if (!item) return;
    const url = item.getAttribute('data-url');
    selectPresetAvatar(url);
}
window.onPresetAvatarClick = onPresetAvatarClick;

function updateSelectedHighlight() {
    const gallery = document.getElementById('presetAvatarGallery');
    if (!gallery) return;
    Array.from(gallery.querySelectorAll('.preset-avatar-item')).forEach(el => {
        const url = el.getAttribute('data-url');
        if (url === selectedAvatarUrl) el.classList.add('preset-selected');
        else el.classList.remove('preset-selected');
    });
}

// Step 2: Save Profile
async function saveProfile() {
    const form = document.getElementById('profileForm');
    if (!form || !form.checkValidity()) {
        if (form) form.reportValidity();
        return;
    }
    
    if (!selectedAvatar && !selectedAvatarUrl) {
        alert('Please select a preset avatar!');
        return;
    }
    
    onboardingData.profile = {
        username: document.getElementById('username').value.trim(),
        avatar: selectedAvatar,
        gender: document.getElementById('gender').value,
        experience: document.getElementById('experience').value,
        trading_style: document.getElementById('tradingStyle').value,
        markets: document.getElementById('markets').value,
        avatar_url: selectedAvatarUrl || (onboardingData.profile?.avatar_url || '')
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
    
    // Enable continue button
    const continueButton = document.getElementById('tokenContinueButton');
    if (continueButton) continueButton.disabled = false;
}

// Step 6: Load Trading Rules for Selection
async function loadRulesForSelection() {
    const defaultRules = [
        // Risk Management (12 rules)
        { category: "Risk Management", rule: "Never risk more than 2% of account per trade" },
        { category: "Risk Management", rule: "Always use stop loss orders on every trade" },
        { category: "Risk Management", rule: "Don't add to losing positions (no averaging down)" },
        { category: "Risk Management", rule: "Maximum 3 open positions at once" },
        { category: "Risk Management", rule: "Risk no more than 6% of account in total at any time" },
        { category: "Risk Management", rule: "Use proper position sizing based on stop loss distance" },
        { category: "Risk Management", rule: "Never use more than 2:1 leverage" },
        { category: "Risk Management", rule: "Set maximum daily loss limit at 5% of account" },
        { category: "Risk Management", rule: "Take profits at predetermined targets" },
        { category: "Risk Management", rule: "Adjust position size based on volatility (ATR)" },
        { category: "Risk Management", rule: "Never risk more on one trade than you can afford to lose" },
        { category: "Risk Management", rule: "Review and adjust stop losses as trade moves in your favor" },
        
        // Entry Rules (15 rules)
        { category: "Entry Rules", rule: "Wait for confirmation before entering any trade" },
        { category: "Entry Rules", rule: "Only trade during market hours (9:30 AM - 4:00 PM ET)" },
        { category: "Entry Rules", rule: "No trading in first 15 minutes of market open" },
        { category: "Entry Rules", rule: "No trading in last 15 minutes before market close" },
        { category: "Entry Rules", rule: "Must have 3:1 minimum reward-to-risk ratio" },
        { category: "Entry Rules", rule: "Only enter trades that align with the trend" },
        { category: "Entry Rules", rule: "Confirm entry with volume analysis" },
        { category: "Entry Rules", rule: "Check multiple timeframes before entry" },
        { category: "Entry Rules", rule: "Wait for pullback to support/resistance in trending markets" },
        { category: "Entry Rules", rule: "Avoid trading during major news events unless planned" },
        { category: "Entry Rules", rule: "Enter only when you have a clear plan" },
        { category: "Entry Rules", rule: "Look for confluence of at least 2 technical indicators" },
        { category: "Entry Rules", rule: "Avoid chasing breakouts - wait for retest" },
        { category: "Entry Rules", rule: "Check correlation with market indices before entry" },
        { category: "Entry Rules", rule: "Only trade setups you have backtested" },
        
        // Exit Rules (12 rules)
        { category: "Exit Rules", rule: "Always take profits at predetermined targets" },
        { category: "Exit Rules", rule: "Move stop to breakeven after 50% of profit target hit" },
        { category: "Exit Rules", rule: "Exit immediately if trade thesis is invalidated" },
        { category: "Exit Rules", rule: "Don't hold overnight unless specifically planned" },
        { category: "Exit Rules", rule: "Trail stops on winning trades" },
        { category: "Exit Rules", rule: "Exit before major economic announcements" },
        { category: "Exit Rules", rule: "Scale out at multiple profit targets" },
        { category: "Exit Rules", rule: "Never move stop loss further away from entry" },
        { category: "Exit Rules", rule: "Exit when price action becomes choppy/unclear" },
        { category: "Exit Rules", rule: "Take partial profits at first target, let rest run" },
        { category: "Exit Rules", rule: "Exit all positions before long weekends/holidays" },
        { category: "Exit Rules", rule: "Don't let winners turn into losers - lock in profits" },
        
        // Psychology (15 rules)
        { category: "Psychology", rule: "No revenge trading after a loss" },
        { category: "Psychology", rule: "Take a break after 2 consecutive losses" },
        { category: "Psychology", rule: "Don't trade when emotional, stressed, or tired" },
        { category: "Psychology", rule: "Journal every trade with emotions and reasoning" },
        { category: "Psychology", rule: "Accept that losses are part of trading" },
        { category: "Psychology", rule: "Don't overtrade - quality over quantity" },
        { category: "Psychology", rule: "Avoid trading when angry or frustrated" },
        { category: "Psychology", rule: "Don't check positions obsessively - trust your plan" },
        { category: "Psychology", rule: "Never trade to 'make back' losses quickly" },
        { category: "Psychology", rule: "Stay humble - market can change anytime" },
        { category: "Psychology", rule: "Don't compare yourself to other traders" },
        { category: "Psychology", rule: "Celebrate small wins, learn from all trades" },
        { category: "Psychology", rule: "Take breaks during losing streaks" },
        { category: "Psychology", rule: "Focus on process, not just profits" },
        { category: "Psychology", rule: "Meditate or exercise before trading session" },
        
        // General (16 rules)
        { category: "General", rule: "Follow your trading plan always" },
        { category: "General", rule: "Review all trades weekly" },
        { category: "General", rule: "No FOMO (Fear of Missing Out) trading" },
        { category: "General", rule: "Keep risk-reward ratio consistent" },
        { category: "General", rule: "Maintain detailed trading journal" },
        { category: "General", rule: "Backtest new strategies before live trading" },
        { category: "General", rule: "Review and update trading plan monthly" },
        { category: "General", rule: "Track all metrics and statistics" },
        { category: "General", rule: "Never trade based on tips or rumors" },
        { category: "General", rule: "Do your own analysis before every trade" },
        { category: "General", rule: "Stick to your watchlist - don't chase random stocks" },
        { category: "General", rule: "Set realistic goals and expectations" },
        { category: "General", rule: "Continuously educate yourself about markets" },
        { category: "General", rule: "Paper trade new strategies first" },
        { category: "General", rule: "Never trade with money you can't afford to lose" },
        { category: "General", rule: "Stay disciplined even during winning streaks" }
    ];
    
    const container = document.getElementById('ruleSelectionContainer');
    container.innerHTML = '';
    // Reset and track totals
    selectedRules = [];
    totalRulesAvailable = defaultRules.length;
    const categories = ['Risk Management', 'Entry Rules', 'Exit Rules', 'Psychology', 'General'];
    
    categories.forEach(category => {
        const categoryRules = defaultRules.filter(r => r.category === category);
        const panel = document.createElement('div');
        panel.className = 'rule-category-panel';
        panel.setAttribute('data-category', category);
        panel.style.cssText = `display: ${category === getActiveCategory() ? 'block' : 'none'};`;
        
        const rulesList = document.createElement('div');
        rulesList.className = 'rules-list';
        panel.appendChild(rulesList);
        
        categoryRules.forEach((ruleData, index) => {
            const ruleId = `rule-${category.replace(/\s/g, '-')}-${index}`;
            const ruleEl = document.createElement('div');
            ruleEl.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; margin-bottom: 0.5rem; background: rgba(255, 255, 255, 0.03); border-radius: 8px; cursor: pointer; transition: all 0.2s;';
            ruleEl.onmouseover = () => ruleEl.style.background = 'rgba(255, 149, 0, 0.1)';
            ruleEl.onmouseout = () => ruleEl.style.background = 'rgba(255, 255, 255, 0.03)';
            
            ruleEl.innerHTML = `
                <input type="checkbox" id="${ruleId}" data-category="${category}" data-rule="${ruleData.rule.replace(/"/g, '&quot;')}" onchange="toggleRuleSelection(this)" style="width: 20px; height: 20px; cursor: pointer;" checked>
                <label for="${ruleId}" style="flex: 1; cursor: pointer; user-select: none;">${ruleData.rule}</label>
            `;
            rulesList.appendChild(ruleEl);
            selectedRules.push({ category, rule: ruleData.rule });
        });
        
        container.appendChild(panel);
    });
    
    updateSelectedCount();
}

function toggleRuleSelection(checkbox) {
    const rule = {
        category: checkbox.getAttribute('data-category'),
        rule: checkbox.getAttribute('data-rule')
    };
    
    if (checkbox.checked) {
        // Avoid duplicates
        if (!selectedRules.find(r => r.rule === rule.rule && r.category === rule.category)) {
            selectedRules.push(rule);
        }
    } else {
        selectedRules = selectedRules.filter(r => r.rule !== rule.rule);
    }
    
    updateSelectedCount();
}

function selectAllRules() {
    const activeCat = getActiveCategory();
    const panel = document.querySelector(`.rule-category-panel[data-category="${activeCat}"]`);
    if (!panel) return;
    panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (!cb.checked) {
            cb.checked = true;
            const rule = { category: cb.getAttribute('data-category'), rule: cb.getAttribute('data-rule') };
            // Avoid duplicates
            if (!selectedRules.find(r => r.rule === rule.rule && r.category === rule.category)) {
                selectedRules.push(rule);
            }
        }
    });
    updateSelectedCount();
}

function deselectAllRules() {
    const activeCat = getActiveCategory();
    const panel = document.querySelector(`.rule-category-panel[data-category="${activeCat}"]`);
    if (!panel) return;
    panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        const ruleText = cb.getAttribute('data-rule');
        const cat = cb.getAttribute('data-category');
        selectedRules = selectedRules.filter(r => !(r.rule === ruleText && r.category === cat));
    });
    updateSelectedCount();
}

function addCustomRuleOnboarding() {
    const category = document.getElementById('customRuleCategory').value;
    const ruleText = document.getElementById('customRuleText').value.trim();
    
    if (!ruleText) {
        alert('Please enter a rule!');
        return;
    }
    
    selectedRules.push({ category, rule: ruleText, isCustom: true });
    document.getElementById('customRuleText').value = '';
    
    // Add visual feedback
    const successMsg = document.createElement('div');
    successMsg.style.cssText = 'position: fixed; top: 2rem; right: 2rem; background: #4CAF50; color: white; padding: 1rem 2rem; border-radius: 8px; z-index: 999999;';
    successMsg.textContent = '✅ Custom rule added!';
    document.body.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 2000);
    
    updateSelectedCount();
}

function updateSelectedCount() {
    const countEl = document.getElementById('selectedRulesCount');
    if (countEl) countEl.textContent = selectedRules.length;
}

// ---- Step 7: Premarket Checklist Setup ----
function renderChecklistItems() {
    const container = document.getElementById('checklistItemsContainer');
    const countEl = document.getElementById('checklistItemsCount');
    if (!container) return;
    
    container.innerHTML = checklistItems.map((item, idx) => `
        <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 8px; margin-bottom: 0.5rem;">
            <span style="flex: 1;">${item}</span>
            <button class="cta-secondary" onclick="editChecklistItem(${idx})" style="padding: 0.3rem 0.6rem;">✏️</button>
            <button class="cta-secondary" onclick="removeChecklistItem(${idx})" style="padding: 0.3rem 0.6rem;">🗑️</button>
        </div>
    `).join('');
    
    if (countEl) countEl.textContent = checklistItems.length;
}

function addChecklistItemOnboarding() {
    const input = document.getElementById('checklistItemInput');
    const text = (input?.value || '').trim();
    if (!text) {
        alert('Please enter a checklist item');
        return;
    }
    checklistItems.push(text);
    input.value = '';
    renderChecklistItems();
}

function editChecklistItem(idx) {
    const newText = prompt('Edit checklist item:', checklistItems[idx]);
    if (newText && newText.trim() && newText !== checklistItems[idx]) {
        checklistItems[idx] = newText.trim();
        renderChecklistItems();
    }
}

function removeChecklistItem(idx) {
    if (confirm('Remove this checklist item?')) {
        checklistItems.splice(idx, 1);
        renderChecklistItems();
    }
}

function loadDefaultChecklist() {
    if (checklistItems.length > 0 && !confirm('This will replace your current checklist. Continue?')) {
        return;
    }
    checklistItems = [
        'Review economic calendar / major news',
        'Define A+ setups and avoid others',
        'Set max loss and risk per trade',
        'Mark key levels and plan entries/exits',
        'Confirm no trading during first 15 minutes',
        'Rehearse stop-loss execution and partials',
        'Check broader market trend and correlations'
    ];
    renderChecklistItems();
}

window.addChecklistItemOnboarding = addChecklistItemOnboarding;
window.editChecklistItem = editChecklistItem;
window.removeChecklistItem = removeChecklistItem;
window.loadDefaultChecklist = loadDefaultChecklist;

// Complete Onboarding
async function completeOnboarding() {
    if (!selectedToken) {
        alert('Please select a progress token');
        return;
    }
    // Require at least some rules selected
    const ack = document.getElementById('ackAllRules');
    if (selectedRules.length === 0) {
        alert('Please select at least one rule to proceed.');
        return;
    }
    if (!ack || !ack.checked) {
        alert('Please acknowledge and accept your selected rules to continue.');
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
        console.log('Selected trading rules:', selectedRules.length);
        
        // Clean up any existing incomplete records first
        try {
            // Delete any existing incomplete user_profiles record
            await supabase
                .from('user_profiles')
                .delete()
                .eq('user_id', user.id)
                .eq('onboarding_completed', false);
            
            // Set existing active goals to inactive (handles unique constraint one_active_goal_per_user)
            await supabase
                .from('user_goals')
                .update({ is_active: false })
                .eq('user_id', user.id)
                .eq('is_active', true);
                
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
                    avatar_url: onboardingData.profile.avatar_url || null,
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
                    total_portfolio: onboardingData.goals.starting_capital,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: 'user_id',
                    ignoreDuplicates: false
                }
            );
        
        if (progressError) console.warn('Progress init warning:', progressError);
        
        // Save selected trading rules
        console.log('💾 Saving', selectedRules.length, 'selected trading rules...');
        const severityByCategory = { 'Risk Management': 3, 'Exit Rules': 3, 'Entry Rules': 2, 'Psychology': 2, 'General': 1 };
        for (const ruleData of selectedRules) {
            await supabase.from('trading_rules').insert({
                user_id: user.id,
                rule: ruleData.rule,
                category: ruleData.category,
                is_active: true,
                severity: severityByCategory[ruleData.category] || 1,
                times_followed: 0,
                times_violated: 0
            });
        }
        console.log('✅ Trading rules saved successfully!');
        
        // Save checklist items
        console.log('💾 Saving', checklistItems.length, 'checklist items...');
        if (checklistItems.length > 0) {
            try {
                for (let i = 0; i < checklistItems.length; i++) {
                    await supabase.from('premarket_checklist_items').insert({
                        user_id: user.id,
                        text: checklistItems[i],
                        sort: i,
                        is_active: true
                    });
                }
                console.log('✅ Checklist items saved successfully!');
            } catch (checklistError) {
                console.warn('⚠️ Could not save checklist items (will use defaults):', checklistError.message);
            }
        }
        
        console.log('✅ Onboarding complete! Redirecting to dashboard...');
        try { localStorage.removeItem('lockin_reset_used'); } catch (_) {}
        
        // Show success message
        const finishButton = document.getElementById('finishButton');
        const finishButtonText = finishButton?.querySelector('span');
        if (finishButtonText) finishButtonText.textContent = '✅ Complete!';
        
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

// Show onboarding success message
function showOnboardingSuccess() {
    // Create success overlay
    const successOverlay = document.createElement('div');
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
window.loadRulesForSelection = loadRulesForSelection;
window.toggleRuleSelection = toggleRuleSelection;
window.addCustomRuleOnboarding = addCustomRuleOnboarding;
window.updateSelectedCount = updateSelectedCount;
window.selectAllRules = selectAllRules;
window.deselectAllRules = deselectAllRules;
