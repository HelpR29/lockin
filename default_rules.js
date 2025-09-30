// Default Trading Rules by Category
// These will be populated when user first visits Rules page

const defaultRules = {
    riskManagement: [
        { rule: "Never risk more than 2% of account per trade", category: "Risk Management" },
        { rule: "Always use stop loss orders", category: "Risk Management" },
        { rule: "Don't add to losing positions", category: "Risk Management" },
        { rule: "Maximum 3 open positions at once", category: "Risk Management" }
    ],
    
    entry: [
        { rule: "Wait for confirmation before entering", category: "Entry Rules" },
        { rule: "Only trade during market hours (9:30 AM - 4:00 PM)", category: "Entry Rules" },
        { rule: "No trading in first/last 15 minutes of market", category: "Entry Rules" },
        { rule: "Must have 3:1 reward-to-risk ratio minimum", category: "Entry Rules" }
    ],
    
    exit: [
        { rule: "Take profits at predetermined targets", category: "Exit Rules" },
        { rule: "Move stop to breakeven after 50% profit", category: "Exit Rules" },
        { rule: "Exit immediately if thesis is invalidated", category: "Exit Rules" },
        { rule: "Don't hold overnight unless planned", category: "Exit Rules" }
    ],
    
    psychology: [
        { rule: "No revenge trading after a loss", category: "Psychology" },
        { rule: "Take a break after 2 consecutive losses", category: "Psychology" },
        { rule: "Don't trade when emotional or stressed", category: "Psychology" },
        { rule: "Journal every trade with emotions", category: "Psychology" }
    ],
    
    general: [
        { rule: "Follow the trading plan always", category: "General" },
        { rule: "Review trades weekly", category: "General" },
        { rule: "No FOMO trading", category: "General" },
        { rule: "Keep risk-reward ratio consistent", category: "General" }
    ]
};

// Function to initialize default rules
async function initializeDefaultRules(userId) {
    try {
        const allRules = [
            ...defaultRules.riskManagement,
            ...defaultRules.entry,
            ...defaultRules.exit,
            ...defaultRules.psychology,
            ...defaultRules.general
        ];
        
        for (const ruleData of allRules) {
            await supabase.from('trading_rules').insert({
                user_id: userId,
                rule: ruleData.rule,
                category: ruleData.category,
                is_active: true
            });
        }
        
        console.log('Default rules initialized successfully!');
        return true;
    } catch (error) {
        console.error('Error initializing rules:', error);
        return false;
    }
}

window.initializeDefaultRules = initializeDefaultRules;
window.defaultRules = defaultRules;
