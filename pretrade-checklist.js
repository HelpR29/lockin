// Pre-Trade Checklist Modal
// Shows daily checklist before allowing trade entry

let pretradeChecklistModal = null;
let pretradeResolveCallback = null;

// Check if today's checklist is completed (all items checked AM and confirmed EOD)
async function isTodayChecklistComplete() {
  try {
    const items = await loadChecklistItems();
    const activeItems = items.filter(i => i.is_active !== false);
    
    if (activeItems.length === 0) return 'no_items'; // Special flag for no checklist
    
    const dailyMap = await loadDailyChecklist();
    
    // Check if all active items are marked (morning_checked)
    for (const item of activeItems) {
      const state = dailyMap[item.id] || {};
      if (!state.morning_checked) {
        return false;
      }
    }
    
    return true;
  } catch (e) {
    console.warn('Error checking checklist:', e);
    return true; // If error, don't block trade
  }
}

// Show pre-trade checklist modal (blocks until user completes)
async function showPretradeChecklistModal() {
  return new Promise(async (resolve) => {
    pretradeResolveCallback = resolve;
    
    const items = await loadChecklistItems();
    const activeItems = items.filter(i => i.is_active !== false);
    const dailyMap = await loadDailyChecklist();
    
    // Remove existing modal if any
    if (pretradeChecklistModal) {
      pretradeChecklistModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'pretradeChecklistModal';
    modal.style.cssText = `
      display: flex;
      position: fixed;
      z-index: 999999;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.95);
      justify-content: center;
      align-items: center;
      animation: fadeIn 0.2s ease;
    `;
    
    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #2C2C2E 0%, #1C1C1E 100%);
        border: 2px solid var(--primary-orange);
        border-radius: 24px;
        padding: 2rem;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(255, 149, 0, 0.4);
        animation: slideUp 0.3s ease;
      ">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">📋</div>
          <h2 style="color: var(--primary-orange); margin: 0 0 0.5rem 0; font-size: 1.8rem;">Pretrade Checklist</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0;">Complete these items before placing your trade</p>
        </div>
        
        <div id="pretradeChecklistItems" style="margin-bottom: 1.5rem;">
          ${activeItems.map(item => {
            const checked = dailyMap[item.id]?.morning_checked || false;
            return `
              <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer;">
                <input type="checkbox" data-item-id="${item.id}" ${checked ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                <span style="flex: 1;">${item.text}</span>
              </label>
            `;
          }).join('')}
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button id="pretradeSkipBtn" style="
            background: transparent;
            border: 2px solid var(--text-secondary);
            color: var(--text-secondary);
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s;
          ">Skip (Not Recommended)</button>
          <button id="pretradeContinueBtn" disabled style="
            background: linear-gradient(135deg, var(--primary-orange), #FF8C00);
            border: none;
            color: white;
            padding: 0.75rem 2rem;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(255, 149, 0, 0.4);
            transition: all 0.3s;
            opacity: 0.5;
          ">Continue to Trade</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    pretradeChecklistModal = modal;
    
    // Add CSS animations if not present
    if (!document.querySelector('#pretrade-modal-animations')) {
      const style = document.createElement('style');
      style.id = 'pretrade-modal-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Handle checkbox changes
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
    const continueBtn = modal.querySelector('#pretradeContinueBtn');
    
    function updateContinueButton() {
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      if (continueBtn) {
        continueBtn.disabled = !allChecked;
        continueBtn.style.opacity = allChecked ? '1' : '0.5';
        continueBtn.style.cursor = allChecked ? 'pointer' : 'not-allowed';
      }
    }
    
    checkboxes.forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const itemId = e.target.getAttribute('data-item-id');
        const checked = e.target.checked;
        
        // Save state
        await saveDailyChecklistState(itemId, { morning_checked: checked });
        
        updateContinueButton();
      });
    });
    
    updateContinueButton();
    
    // Skip button
    modal.querySelector('#pretradeSkipBtn').addEventListener('click', () => {
      modal.remove();
      pretradeChecklistModal = null;
      if (pretradeResolveCallback) {
        pretradeResolveCallback(true); // Allow trade but note skipped
      }
    });
    
    // Continue button
    continueBtn.addEventListener('click', () => {
      modal.remove();
      pretradeChecklistModal = null;
      if (pretradeResolveCallback) {
        pretradeResolveCallback(true);
      }
    });
  });
}

// Check and enforce checklist before allowing trade
async function enforcePretradeChecklist() {
  const isComplete = await isTodayChecklistComplete();
  
  if (!isComplete) {
    return await showPretradeChecklistModal();
  }
  
  return true; // Checklist already complete
}

window.enforcePretradeChecklist = enforcePretradeChecklist;
window.isTodayChecklistComplete = isTodayChecklistComplete;
window.showPretradeChecklistModal = showPretradeChecklistModal;
