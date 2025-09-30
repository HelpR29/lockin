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
        const { data: categories, error: catError } = await supabase
            .from('rule_categories')
            .select('*')
            .order('display_order');

        if (catError) {
            console.error('Error fetching categories:', catError);
            return;
        }

    const { data: rules, error: rulesError } = await supabase
        .from('user_defined_rules')
        .select('*');

    if (rulesError) {
        console.error('Error fetching rules:', rulesError);
        return;
    }

    const container = document.getElementById('ruleCategoriesContainer');
    container.innerHTML = '';

    for (const category of categories) {
        const categoryRules = rules.filter(rule => rule.category_id === category.id);
        
        const categoryEl = document.createElement('div');
        categoryEl.className = 'rule-category';
        categoryEl.innerHTML = `
            <h3 class="category-title">${category.name}</h3>
            <div class="rule-list" id="category-${category.id}">
                ${categoryRules.length === 0 ? '<p class="no-rules">No rules defined for this category.</p>' : ''}
            </div>
        `;
        container.appendChild(categoryEl);

        const ruleListEl = document.getElementById(`category-${category.id}`);
        for (const rule of categoryRules) {
            const ruleEl = document.createElement('div');
            ruleEl.className = 'rule-item';
            ruleEl.innerHTML = `
                <p class="rule-text">${rule.rule_text}</p>
                <div class="rule-actions">
                    <label class="switch">
                        <input type="checkbox" ${rule.is_active ? 'checked' : ''} onchange="toggleRuleActive('${rule.id}', this.checked)">
                        <span class="slider round"></span>
                    </label>
                    <button class="edit-btn" onclick="editRule('${rule.id}', '${rule.rule_text}', '${rule.category_id}')">Edit</button>
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
        ({ error } = await supabase.from('user_defined_rules').update(ruleData).eq('id', ruleId));
    } else {
        // Insert new rule
        ({ error } = await supabase.from('user_defined_rules').insert(ruleData));
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

    const { error } = await supabase.from('user_defined_rules').delete().eq('id', id);

    if (error) {
        console.error('Error deleting rule:', error);
        alert('Could not delete the rule.');
    } else {
        await loadRules();
    }
}

async function toggleRuleActive(id, isActive) {
    const { error } = await supabase.from('user_defined_rules').update({ is_active: isActive }).eq('id', id);
    if (error) {
        console.error('Error updating rule status:', error);
    }
}

async function populateTemplateModal() {
    const { data: templates, error } = await supabase
        .from('rule_templates')
        .select('*, rule_categories(name)');

    if (error) return;

    const templateList = document.getElementById('templateList');
    templateList.innerHTML = '';

    const groupedTemplates = templates.reduce((acc, t) => {
        const category = t.rule_categories.name;
        if (!acc[category]) acc[category] = [];
        acc[category].push(t);
        return acc;
    }, {});

    for (const category in groupedTemplates) {
        const categoryEl = document.createElement('div');
        categoryEl.className = 'template-category';
        categoryEl.innerHTML = `<h4>${category}</h4>`;
        
        groupedTemplates[category].forEach(template => {
            const templateEl = document.createElement('div');
            templateEl.className = 'template-item';
            templateEl.innerHTML = `
                <p>${template.name}</p>
                <button onclick="addRuleFromTemplate('${template.id}')">Add</button>
            `;
            categoryEl.appendChild(templateEl);
        });
        templateList.appendChild(categoryEl);
    }
}

async function addRuleFromTemplate(templateId) {
    const { data: template } = await supabase
        .from('rule_templates')
        .select('*')
        .eq('id', templateId)
        .single();

    if (!template) return;

    const user = (await supabase.auth.getUser()).data.user;
    const ruleData = {
        user_id: user.id,
        rule_text: template.name,
        category_id: template.category_id,
        template_id: template.id
    };

    const { error } = await supabase.from('user_defined_rules').insert(ruleData);

    if (error) {
        console.error('Error adding rule from template:', error);
        alert('Could not add the rule.');
    } else {
        closeModal('templateModal');
        await loadRules();
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
window.editRule = editRule;
window.deleteRule = deleteRule;
window.toggleRuleActive = toggleRuleActive;
window.addRuleFromTemplate = addRuleFromTemplate;
window.openModal = openModal;
window.closeModal = closeModal;
