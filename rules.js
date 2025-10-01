document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    await loadRules();
    await populateCategoryDropdown();
    await populateTemplateModal();
    document.getElementById('ruleForm').addEventListener('submit', saveRule);
});

async function loadRules() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: rules, error: rulesError } = await supabase
            .from('trading_rules')
            .select('*')
            .eq('user_id', user.id);

        if (rulesError) {
            console.error('Error fetching rules:', rulesError);
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
            const categoryRules = rules.filter(rule => rule.category === category);
            const categoryEl = document.createElement('div');
            categoryEl.className = 'rule-category';
            categoryEl.style.cssText = 'display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: rgba(255, 149, 0, 0.05); border-radius: 12px; margin-bottom: 1rem; border: 1px solid rgba(255, 149, 0, 0.2);';
            categoryEl.innerHTML = `
                <span style="font-size: 2rem;">${categoryIcons[category] || '📋'}</span>
                <div>
                    <h3 class="category-title" style="margin: 0;">${category}</h3>
                    <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0;">Add rules to organize your trading strategy</p>
                </div>
            `;
            container.appendChild(categoryEl);

            const ruleListEl = document.createElement('div');
            ruleListEl.className = 'rule-list';
            ruleListEl.id = `category-${category.replace(/\s+/g, '-').toLowerCase()}`;
            ruleListEl.innerHTML = categoryRules.length === 0 ? '<p class="no-rules">No rules in this category yet. Add from templates below!</p>' : '';
            container.appendChild(ruleListEl);

            for (const rule of categoryRules) {
            const adherencePercent = rule.times_followed + rule.times_violated > 0 
                ? Math.round((rule.times_followed / (rule.times_followed + rule.times_violated)) * 100)
                : 100;
            const adherenceColor = adherencePercent >= 90 ? 'var(--success)' : adherencePercent >= 70 ? 'var(--warning)' : 'var(--danger)';
            
            const ruleEl = document.createElement('div');
            ruleEl.className = 'rule-item';
            ruleEl.style.borderLeft = rule.is_active ? '3px solid var(--primary)' : '3px solid var(--text-muted)';
            ruleEl.innerHTML = `
                <div style="flex: 1;">
                    <p class="rule-text" style="font-weight: 500; margin-bottom: 0.5rem;">${rule.rule_text}</p>
                    ${rule.numeric_value ? `<span style="display: inline-block; padding: 0.25rem 0.75rem; background: rgba(255, 149, 0, 0.1); color: var(--primary); border-radius: 12px; font-size: 0.875rem; font-weight: 600;">${rule.numeric_value}${rule.numeric_unit || ''}</span>` : ''}
                    <div style="display: flex; gap: 1rem; margin-top: 0.5rem; font-size: 0.875rem;">
                        <span style="color: var(--text-secondary);">✓ Followed: ${rule.times_followed}</span>
                        <span style="color: var(--text-secondary);">✗ Violated: ${rule.times_violated}</span>
                        <span style="color: ${adherenceColor}; font-weight: 600;">Adherence: ${adherencePercent}%</span>
                    </div>
                </div>
                <div class="rule-actions" style="display: flex; gap: 0.5rem; align-items: center;">
                    <label class="switch">
                        <input type="checkbox" ${rule.is_active ? 'checked' : ''} onchange="toggleRuleActive('${rule.id}', this.checked)">
                        <span class="slider round"></span>
                    </label>
                    <button class="edit-btn" onclick="editRule('${rule.id}', '${rule.rule_text.replace(/'/g, "\\'")}'  , '${rule.category_id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteRule('${rule.id}')">Delete</button>
                </div>
            `;
            ruleListEl.appendChild(ruleEl);
        }
    }
    } catch (error) {
        console.error('Error loading rules:', error);
        alert('Failed to load rules. Please refresh the page.');
    }
}

async function populateCategoryDropdown() {
    const { data: categories, error } = await supabase
        .from('rule_categories')
        .select('*')
        .order('display_order');

    if (error) return;

    const selectEl = document.getElementById('ruleCategory');
    selectEl.innerHTML = categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

async function saveRule(e) {
    e.preventDefault();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Please log in to save rules.');
            return;
        }

    const ruleId = document.getElementById('ruleId').value;
    const ruleText = document.getElementById('ruleText').value;
    const categoryId = document.getElementById('ruleCategory').value;

    const ruleData = {
        user_id: user.id,
        rule_text: ruleText,
        category_id: categoryId,
    };

    let error;
    if (ruleId) {
        // Update existing rule
        ({ error } = await supabase.from('trading_rules').update(ruleData).eq('id', ruleId));
    } else {
        // Insert new rule
        ({ error } = await supabase.from('trading_rules').insert(ruleData));
    }

        if (error) {
            console.error('Error saving rule:', error);
            alert('Could not save the rule.');
        } else {
            closeModal('ruleModal');
            await loadRules();
        }
    } catch (error) {
        console.error('Error saving rule:', error);
        alert('An error occurred. Please try again.');
    }
}

function openAddRuleModal() {
    document.getElementById('ruleForm').reset();
    document.getElementById('ruleId').value = '';
    document.getElementById('modalTitle').textContent = 'Add New Rule';
    openModal('ruleModal');
}

function openTemplateModal() {
    populateTemplateModal();
    openModal('templateModal');
}

function editRule(id, text, categoryId) {
    document.getElementById('ruleForm').reset();
    document.getElementById('ruleId').value = id;
    document.getElementById('ruleText').value = text;
    document.getElementById('ruleCategory').value = categoryId;
    document.getElementById('modalTitle').textContent = 'Edit Rule';
    openModal('ruleModal');
}

async function deleteRule(id) {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    const { error } = await supabase.from('trading_rules').delete().eq('id', id);

    if (error) {
        console.error('Error deleting rule:', error);
        alert('Could not delete the rule.');
    } else {
        await loadRules();
    }
}

async function toggleRuleActive(id, isActive) {
    const { error } = await supabase.from('trading_rules').update({ is_active: isActive }).eq('id', id);
    if (error) {
        console.error('Error updating rule status:', error);
    }
}

async function populateTemplateModal() {
    const { data: templates, error } = await supabase
        .from('rule_templates')
        .select('*, rule_categories(name, icon)');

    if (error) {
        console.error('Error loading templates:', error);
        return;
    }

    const templateList = document.getElementById('templateList');
    templateList.innerHTML = '<div style="max-height: 60vh; overflow-y: auto;">';

    const groupedTemplates = templates.reduce((acc, t) => {
        const category = t.rule_categories.name;
        if (!acc[category]) acc[category] = [];
        acc[category].push(t);
        return acc;
    }, {});

    for (const category in groupedTemplates) {
        const categoryData = templates.find(t => t.rule_categories.name === category).rule_categories;
        const categoryEl = document.createElement('div');
        categoryEl.className = 'template-category';
        categoryEl.style.marginBottom = '2rem';
        categoryEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--border);">
                <span style="font-size: 1.5rem;">${categoryData.icon || '📋'}</span>
                <h4 style="margin: 0; color: var(--primary);">${category}</h4>
            </div>
        `;
        
        groupedTemplates[category].forEach(template => {
            const templateEl = document.createElement('div');
            templateEl.className = 'template-item';
            templateEl.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 1rem; margin-bottom: 0.5rem; background: rgba(255, 149, 0, 0.05); border-radius: 12px; border: 1px solid rgba(255, 149, 0, 0.2);';
            templateEl.innerHTML = `
                <div style="flex: 1;">
                    <p style="font-weight: 500; margin-bottom: 0.25rem;">${template.name}</p>
                    ${template.description ? `<p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0;">${template.description}</p>` : ''}
                    ${template.is_numeric && template.numeric_value ? `<span style="display: inline-block; margin-top: 0.5rem; padding: 0.25rem 0.75rem; background: var(--primary); color: var(--bg-primary); border-radius: 8px; font-size: 0.875rem; font-weight: 600;">${template.numeric_value}${template.numeric_unit || ''}</span>` : ''}
                </div>
                <button class="cta-secondary" onclick="addRuleFromTemplate('${template.id}')" style="margin-left: 1rem; white-space: nowrap;">+ Add</button>
            `;
            categoryEl.appendChild(templateEl);
        });
        templateList.appendChild(categoryEl);
    }
    templateList.innerHTML = templateList.innerHTML + '</div>';
}

async function addRuleFromTemplate(templateId) {
    try {
        const { data: template } = await supabase
            .from('rule_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (!template) {
            alert('Template not found.');
            return;
        }

        const user = (await supabase.auth.getUser()).data.user;
        if (!user) {
            alert('Please log in.');
            return;
        }
        
        const ruleData = {
            user_id: user.id,
            rule_text: template.name,
            category_id: template.category_id,
            template_id: template.id,
            is_numeric: template.is_numeric || false,
            numeric_value: template.numeric_value,
            numeric_unit: template.numeric_unit
        };

        const { error } = await supabase.from('trading_rules').insert(ruleData);

        if (error) {
            console.error('Error adding rule from template:', error);
            alert('Could not add the rule.');
        } else {
            closeModal('templateModal');
            await loadRules();
        }
    } catch (error) {
        console.error('Error adding rule from template:', error);
        alert('An error occurred. Please try again.');
    }
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

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
}

// Export functions to global scope for HTML onclick handlers
window.openAddRuleModal = openAddRuleModal;
window.openTemplateModal = openTemplateModal;
window.editRule = editRule;
window.deleteRule = deleteRule;
window.toggleRuleActive = toggleRuleActive;
window.addRuleFromTemplate = addRuleFromTemplate;
window.openModal = openModal;
window.closeModal = closeModal;
