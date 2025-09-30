// Simplified Rules System for trading_rules table

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
                            <span>✓ Followed: ${rule.times_followed}</span>
                            <span>✗ Violated: ${rule.times_violated}</span>
                            <span style="color: ${adherenceColor}; font-weight: 600;">Adherence: ${adherencePercent}%</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <label style="display: inline-flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" ${rule.is_active ? 'checked' : ''} onchange="toggleRuleActive('${rule.id}', this.checked)" style="width: 20px; height: 20px; cursor: pointer;">
                            <span style="margin-left: 0.5rem; font-size: 0.875rem;">Active</span>
                        </label>
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
                    <p>No rules found. Complete onboarding to get default rules, or refresh this page.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading rules:', error);
        alert('Failed to load rules. Please refresh the page.');
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

// Export to global
window.toggleRuleActive = toggleRuleActive;
