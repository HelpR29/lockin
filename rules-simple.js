// Simplified Rules System for trading_rules table

// Define functions globally first
function openAddRuleModal() {
    document.getElementById('customRuleForm').reset();
    openModal('addRuleModal');
}

function openTemplateModal() {
    openModal('templateModal');
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
    }
}

async function toggleRuleActive(id, isActive) {
    const { error } = await supabase
        .from('trading_rules')
        .update({ is_active: isActive })
        .eq('id', id);
    
    if (error) {
        console.error('Error updating rule:', error);
        alert('Failed to update rule status.');
    }
}

async function saveCustomRule(event) {
    event.preventDefault();
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Please log in to add rules.');
            return;
        }
        
        const category = document.getElementById('ruleCategory').value;
        const ruleText = document.getElementById('ruleText').value;
        
        const { error } = await supabase
            .from('trading_rules')
            .insert({
                user_id: user.id,
                rule: ruleText,
                category: category,
                is_active: true
            });
        
        if (error) {
            console.error('Error adding rule:', error);
            alert('Failed to add rule. Please try again.');
        } else {
            closeModal('addRuleModal');
            document.getElementById('customRuleForm').reset();
            await loadRules();
            alert('Custom rule added successfully!');
        }
    } catch (error) {
        console.error('Error saving rule:', error);
        alert('An error occurred. Please try again.');
    }
}

// Export to global immediately
window.toggleRuleActive = toggleRuleActive;
window.saveCustomRule = saveCustomRule;
window.openAddRuleModal = openAddRuleModal;
window.openTemplateModal = openTemplateModal;
window.openModal = openModal;
window.closeModal = closeModal;
window.loadRules = loadRules;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    await loadRules();
});

async function loadRules() {
    try {
        console.log('🔄 Loading rules...');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: rules, error } = await supabase
            .from('trading_rules')
            .select('*')
            .eq('user_id', user.id)
            .order('category, created_at');

        if (error) {
            console.error('Error fetching rules:', error);
            return;
        }
        
        console.log('✅ Loaded', rules.length, 'rules');

        const container = document.getElementById('ruleCategoriesContainer');
        container.innerHTML = '';

        // Group rules by category
        const categories = ['Risk Management', 'Entry Rules', 'Exit Rules', 'Psychology', 'General'];
        const categoryIcons = {
            'Risk Management': '⚠️',
            'Entry Rules': '📥',
            'Exit Rules': '📤',
            'Psychology': '🧠',
            'General': '📋'
        };

        for (const category of categories) {
            const categoryRules = rules.filter(r => r.category === category);
            
            if (categoryRules.length === 0) continue; // Skip empty categories
            
            const categoryEl = document.createElement('div');
            categoryEl.className = 'rule-category';
            categoryEl.style.cssText = 'background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem;';
            
            const categoryHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
                    <span style="font-size: 2rem;">${categoryIcons[category]}</span>
                    <div>
                        <h3 style="margin: 0; color: var(--primary);">${category}</h3>
                    </div>
                </div>
                <div class="rule-list"></div>
            `;
            
            categoryEl.innerHTML = categoryHTML;
            container.appendChild(categoryEl);
            
            const ruleList = categoryEl.querySelector('.rule-list');
            
            for (const rule of categoryRules) {
                const adherencePercent = rule.times_followed + rule.times_violated > 0 
                    ? Math.round((rule.times_followed / (rule.times_followed + rule.times_violated)) * 100)
                    : 100;
                const adherenceColor = adherencePercent >= 90 ? '#4CAF50' : adherencePercent >= 70 ? '#FFC107' : '#F44336';
                
                const ruleEl = document.createElement('div');
                ruleEl.style.cssText = `
                    background: rgba(255, 255, 255, 0.03);
                    border-left: 3px solid ${rule.is_active ? 'var(--primary)' : '#666'};
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 0.75rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                `;
                
                ruleEl.innerHTML = `
                    <div style="flex: 1;">
                        <p style="font-weight: 500; margin: 0 0 0.5rem 0; color: var(--text-primary);">${rule.rule}</p>
                        <div style="display: flex; gap: 1rem; font-size: 0.875rem; color: var(--text-secondary);">
                            <span>✓ Followed: ${rule.times_followed || 0}</span>
                            <span>✗ Violated: ${rule.times_violated || 0}</span>
                            <span style="color: ${adherenceColor}; font-weight: 600;">Adherence: ${adherencePercent}%</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <label style="display: inline-flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" ${rule.is_active ? 'checked' : ''} onchange="toggleRuleActive('${rule.id}', this.checked)" style="width: 20px; height: 20px; cursor: pointer;">
                            <span style="margin-left: 0.5rem; font-size: 0.875rem;">Active</span>
                        </label>
                        <button class="rule-edit-btn" onclick="editRule('${rule.id}', '${rule.rule.replace(/'/g, "\\'")}', '${rule.category}')">✏️</button>
                        <button class="rule-delete-btn" onclick="deleteRule('${rule.id}')">🗑️</button>
                    </div>
                `;
                
                ruleList.appendChild(ruleEl);
            }
        }
        
        // Show empty state if no rules
        if (rules.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                    <p style="margin-bottom: 1rem;">No rules found yet!</p>
                    <button class="cta-primary" onclick="initializeDefaultRules()" style="padding: 0.75rem 2rem;">📦 Load Default Rules</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading rules:', error);
        alert('Failed to load rules. Please refresh the page.');
    }
}

// Initialize comprehensive default rules
async function initializeDefaultRules() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Please log in first.');
            return;
        }

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

        console.log('📦 Inserting', defaultRules.length, 'default rules...');
        
        for (const ruleData of defaultRules) {
            await supabase.from('trading_rules').insert({
                user_id: user.id,
                rule: ruleData.rule,
                category: ruleData.category,
                is_active: true,
                times_followed: 0,
                times_violated: 0
            });
        }
        
        console.log('✅ Default rules initialized successfully!');
        alert('🎉 70 comprehensive trading rules added! Reload the page to see them.');
        await loadRules();
    } catch (error) {
        console.error('Error initializing default rules:', error);
        alert('Failed to load default rules: ' + error.message);
    }
}

window.initializeDefaultRules = initializeDefaultRules;

// Edit Rule Function
async function editRule(id, currentRule, category) {
    const newRule = prompt('Edit your rule:', currentRule);
    
    if (newRule && newRule.trim() !== '' && newRule !== currentRule) {
        try {
            const { error } = await supabase
                .from('trading_rules')
                .update({ rule: newRule.trim() })
                .eq('id', id);
            
            if (error) {
                console.error('Error updating rule:', error);
                alert('Failed to update rule: ' + error.message);
            } else {
                console.log('✅ Rule updated successfully');
                await loadRules();
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.style.cssText = 'position: fixed; top: 2rem; right: 2rem; background: #4CAF50; color: white; padding: 1rem 2rem; border-radius: 8px; z-index: 999999; animation: slideIn 0.3s ease;';
                successMsg.textContent = '✅ Rule updated successfully!';
                document.body.appendChild(successMsg);
                setTimeout(() => successMsg.remove(), 3000);
            }
        } catch (error) {
            console.error('Error updating rule:', error);
            alert('An error occurred: ' + error.message);
        }
    }
}

// Delete Rule Function
async function deleteRule(id) {
    if (!confirm('Are you sure you want to delete this rule? This action cannot be undone.')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('trading_rules')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error deleting rule:', error);
            alert('Failed to delete rule: ' + error.message);
        } else {
            console.log('✅ Rule deleted successfully');
            await loadRules();
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.style.cssText = 'position: fixed; top: 2rem; right: 2rem; background: #F44336; color: white; padding: 1rem 2rem; border-radius: 8px; z-index: 999999; animation: slideIn 0.3s ease;';
            successMsg.textContent = '🗑️ Rule deleted successfully!';
            document.body.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 3000);
        }
    } catch (error) {
        console.error('Error deleting rule:', error);
        alert('An error occurred: ' + error.message);
    }
}

window.editRule = editRule;
window.deleteRule = deleteRule;

