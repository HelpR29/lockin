// Automatic Rule Violation Tracking System

// Check trade against all active rules
async function checkTradeForViolations(trade) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Get all active rules
        const { data: rules, error } = await supabase
            .from('trading_rules')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true);
        
        if (error || !rules) return;
        
        const violations = [];
        
        for (const rule of rules) {
            const violated = await checkRule(rule, trade, user.id);
            if (violated) {
                violations.push({ rule, reason: violated });
            }
        }
        
        // Log violations
        for (const violation of violations) {
            await logViolation(violation.rule.id, trade.id, user.id, violation.reason);
        }
        
        return violations;
    } catch (error) {
        console.error('Error checking trade violations:', error);
    }
}

// Check specific rule against trade
async function checkRule(rule, trade, userId) {
    const ruleText = rule.rule.toLowerCase();
    
    // Risk Management Rules
    if (ruleText.includes('risk') && ruleText.includes('2%')) {
        // Check if risk > 2% of account
        const { data: goals } = await supabase
            .from('user_goals')
            .select('current_capital')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();
        
        if (goals) {
            const maxRisk = goals.current_capital * 0.02;
            const risk = Math.abs(trade.entry_price - (trade.stop_loss || 0)) * trade.position_size;
            if (risk > maxRisk) {
                return `Risked $${risk.toFixed(2)} (>${maxRisk.toFixed(2)} max)`;
            }
        }
    }
    
    // Stop loss rule
    if (ruleText.includes('stop loss') && ruleText.includes('always')) {
        if (!trade.stop_loss || trade.stop_loss === 0) {
            return 'No stop loss set';
        }
    }
    
    // Max positions rule
    if (ruleText.includes('maximum') && ruleText.includes('open positions')) {
        const maxMatch = ruleText.match(/(\d+)\s+open/);
        if (maxMatch) {
            const maxPositions = parseInt(maxMatch[1]);
            const { data: openTrades } = await supabase
                .from('trades')
                .select('id')
                .eq('user_id', userId)
                .eq('status', 'open');
            
            if (openTrades && openTrades.length >= maxPositions) {
                return `${openTrades.length} positions open (max ${maxPositions})`;
            }
        }
    }
    
    // Market hours rule (use entry_time if provided; America/New_York)
    if (ruleText.includes('market hours') || ruleText.includes('9:30')) {
        const baseISO = trade.entry_time || trade.created_at;
        const baseDate = new Date(baseISO);
        // If helper exists, use isNYMarketOpen; fallback to local hours check
        if (typeof window !== 'undefined' && typeof window.isNYMarketOpen === 'function') {
            if (!window.isNYMarketOpen(baseDate)) {
                const etTime = (typeof window.formatNY === 'function') ? window.formatNY(baseDate, { hour: '2-digit', minute: '2-digit' }) : baseDate.toLocaleTimeString();
                return `Traded at ${etTime} ET (outside market hours)`;
            }
        } else {
            const hour = baseDate.getHours();
            const minute = baseDate.getMinutes();
            if (hour < 9 || (hour === 9 && minute < 30) || hour >= 16) {
                return `Traded at ${baseDate.toLocaleTimeString()} (outside market hours)`;
            }
        }
    }
    
    // First/Last 15 minutes rule (ET)
    if (ruleText.includes('first') && ruleText.includes('15')) {
        const baseISO = trade.entry_time || trade.created_at;
        const baseDate = new Date(baseISO);
        if (typeof window !== 'undefined' && typeof window.nyMinutesSinceMidnight === 'function') {
            const mins = window.nyMinutesSinceMidnight(baseDate);
            const first15 = (mins >= (9*60+30) && mins < (9*60+45));
            const last15 = (mins >= (15*60+45) && mins <= (16*60));
            if (first15 || last15) {
                return 'Traded in first/last 15 minutes of market';
            }
        } else {
            const hour = baseDate.getHours();
            const minute = baseDate.getMinutes();
            if ((hour === 9 && minute >= 30 && minute < 45) || (hour === 15 && minute >= 45)) {
                return `Traded in first/last 15 minutes`;
            }
        }
    }
    
    // Reward-to-risk ratio
    if (ruleText.includes('3:1') || ruleText.includes('reward') && ruleText.includes('risk')) {
        if (trade.stop_loss && trade.target_price) {
            const risk = Math.abs(trade.entry_price - trade.stop_loss);
            const reward = Math.abs(trade.target_price - trade.entry_price);
            const ratio = reward / risk;
            
            if (ratio < 3) {
                return `R:R ratio ${ratio.toFixed(2)}:1 (min 3:1)`;
            }
        }
    }
    
    // No revenge trading (check for trading after loss)
    if (ruleText.includes('revenge') || ruleText.includes('after') && ruleText.includes('loss')) {
        const { data: recentTrades } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'closed')
            .order('created_at', { ascending: false })
            .limit(2);
        
        if (recentTrades && recentTrades.length > 0) {
            const lastTrade = recentTrades[0];
            const lastPnL = (lastTrade.exit_price - lastTrade.entry_price) * lastTrade.position_size;
            
            // If last trade was a loss and current trade was within 30 minutes
            if (lastPnL < 0) {
                const lastTradeTime = new Date(lastTrade.created_at);
                const currentTradeTime = new Date(trade.created_at);
                const diffMinutes = (currentTradeTime - lastTradeTime) / (1000 * 60);
                
                if (diffMinutes < 30) {
                    return 'Possible revenge trade (within 30 min of loss)';
                }
            }
        }
    }
    
    // Break after 2 consecutive losses
    if (ruleText.includes('break') && ruleText.includes('2') && ruleText.includes('loss')) {
        const { data: recentTrades } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'closed')
            .order('created_at', { ascending: false })
            .limit(3);
        
        if (recentTrades && recentTrades.length >= 2) {
            const lastTwo = recentTrades.slice(0, 2);
            const bothLosses = lastTwo.every(t => {
                const pnl = (t.exit_price - t.entry_price) * t.position_size;
                return pnl < 0;
            });
            
            if (bothLosses) {
                return 'Trading after 2 consecutive losses';
            }
        }
    }
    
    return null; // No violation
}

// Log violation to database
async function logViolation(ruleId, tradeId, userId, reason) {
    try {
        // Insert violation
        await supabase.from('rule_violations').insert({
            user_id: userId,
            rule_id: ruleId,
            trade_id: tradeId,
            notes: reason
        });
        
        // Increment violation counter
        const { data: rule } = await supabase
            .from('trading_rules')
            .select('times_violated')
            .eq('id', ruleId)
            .single();
        
        await supabase
            .from('trading_rules')
            .update({ times_violated: (rule?.times_violated || 0) + 1 })
            .eq('id', ruleId);
        
        // Get rule name for penalty
        const { data: ruleData } = await supabase
            .from('trading_rules')
            .select('rule')
            .eq('id', ruleId)
            .single();
        
        // Penalize
        if (typeof penalizeForRuleViolation === 'function' && ruleData) {
            await penalizeForRuleViolation(ruleData.rule);
        }
        
        console.log(`⚠️ Violation logged: ${reason}`);
    } catch (error) {
        console.error('Error logging violation:', error);
    }
}

// Mark rule as followed
async function markRuleFollowed(ruleId) {
    try {
        const { data: rule } = await supabase
            .from('trading_rules')
            .select('times_followed')
            .eq('id', ruleId)
            .single();
        
        await supabase
            .from('trading_rules')
            .update({ times_followed: (rule?.times_followed || 0) + 1 })
            .eq('id', ruleId);
    } catch (error) {
        console.error('Error marking rule followed:', error);
    }
}

// Export functions
window.checkTradeForViolations = checkTradeForViolations;
window.checkRule = checkRule;
window.markRuleFollowed = markRuleFollowed;
