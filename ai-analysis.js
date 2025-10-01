// AI Trading Analysis using OpenAI

async function generateAIAnalysis() {
    const btn = document.getElementById('analyzeBtn');
    const btnText = document.getElementById('analyzeBtnText');
    const originalText = btnText.textContent;
    
    try {
        // Disable button
        btn.disabled = true;
        btnText.textContent = 'Analyzing...';
        
        // Get user trades
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Please log in to analyze trades.');
            return;
        }
        
        const { data: trades, error } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            throw new Error('Failed to load trades');
        }
        
        if (!trades || trades.length === 0) {
            alert('No trades to analyze. Log some trades first!');
            return;
        }
        
        // Calculate stats
        const stats = calculateTradeStats(trades);
        updateQuickStats(stats);
        
        // Get user's trading rules
        const { data: userRules } = await supabase
            .from('trading_rules')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true);
        
        // Generate AI analysis with rules
        const analysis = await analyzeWithAI(trades, stats, userRules);
        displayAIAnalysis(analysis);
        
    } catch (error) {
        console.error('Error generating analysis:', error);
        alert('Failed to generate analysis. Please try again.');
    } finally {
        btn.disabled = false;
        btnText.textContent = originalText;
    }
}

function calculateTradeStats(trades) {
    let wins = 0;
    let losses = 0;
    let totalPnL = 0;
    let totalWins = 0;
    let totalLosses = 0;
    const closedTrades = trades.filter(t => t.status === 'closed' && t.exit_price);
    
    closedTrades.forEach(trade => {
        // Calculate P&L - for options, multiply by 100
        const isOption = trade.trade_type === 'call' || trade.trade_type === 'put';
        const multiplier = isOption ? 100 : 1;
        const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * multiplier * (trade.direction === 'short' ? -1 : 1);
        totalPnL += pnl;
        
        if (pnl > 0) {
            wins++;
            totalWins += pnl;
        } else if (pnl < 0) {
            losses++;
            totalLosses += Math.abs(pnl);
        }
    });
    
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100) : 0;
    const avgPnL = totalTrades > 0 ? (totalPnL / totalTrades) : 0;
    
    // Calculate Profit Factor = Gross Profit / Gross Loss
    const profitFactor = totalLosses > 0 ? (totalWins / totalLosses) : (totalWins > 0 ? 999 : 0);
    
    return {
        totalTrades,
        wins,
        losses,
        winRate,
        avgPnL,
        totalPnL,
        profitFactor,
        totalWins,
        totalLosses,
        closedTrades
    };
}

function updateQuickStats(stats) {
    const winRateEl = document.getElementById('winRate');
    const avgPnlEl = document.getElementById('avgPnl');
    
    if (winRateEl) {
        winRateEl.textContent = `${stats.winRate.toFixed(1)}%`;
        winRateEl.style.color = stats.winRate >= 50 ? '#4CAF50' : '#F44336';
    }
    
    if (avgPnlEl) {
        avgPnlEl.textContent = `$${stats.avgPnL.toFixed(2)}`;
        avgPnlEl.style.color = stats.avgPnL >= 0 ? '#4CAF50' : '#F44336';
    }
}

async function analyzeWithAI(trades, stats, userRules) {
    // Prepare data for AI
    const tradesummary = trades.slice(0, 10).map(t => ({
        symbol: t.symbol,
        type: t.trade_type || 'stock',
        direction: t.direction,
        entry: t.entry_price,
        exit: t.exit_price,
        pnl: t.exit_price ? (t.exit_price - t.entry_price) * t.position_size * (t.direction === 'short' ? -1 : 1) : 0,
        emotions: t.emotions,
        notes: t.notes
    }));
    
    const emotionCounts = {};
    trades.forEach(t => {
        if (t.emotions && Array.isArray(t.emotions)) {
            t.emotions.forEach(emotion => {
                emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
            });
        }
    });
    
    // Generate local AI insights (no API needed for basic analysis)
    const insights = generateLocalInsights(trades, stats, emotionCounts, userRules);
    
    return insights;
}

function generateLocalInsights(trades, stats, emotionCounts, userRules) {
    const insights = {
        keyInsights: [],
        patterns: [],
        recommendations: []
    };
    
    // Key Insights
    if (stats.winRate >= 60) {
        insights.keyInsights.push(`🎯 Strong performance with ${stats.winRate.toFixed(1)}% win rate`);
    } else if (stats.winRate >= 40) {
        insights.keyInsights.push(`📊 Moderate win rate of ${stats.winRate.toFixed(1)}% - room for improvement`);
    } else {
        insights.keyInsights.push(`⚠️ Low win rate of ${stats.winRate.toFixed(1)}% - review your strategy`);
    }
    
    // Profit Factor insight
    const pfColor = stats.profitFactor >= 2 ? '🟢' : stats.profitFactor >= 1 ? '🟡' : '🔴';
    const pfRating = stats.profitFactor >= 2 ? 'Excellent' : stats.profitFactor >= 1.5 ? 'Good' : stats.profitFactor >= 1 ? 'Break-even' : 'Poor';
    insights.keyInsights.push(`${pfColor} Profit Factor: ${stats.profitFactor.toFixed(2)} (${pfRating})`);
    
    if (stats.avgPnL > 0) {
        insights.keyInsights.push(`💰 Average profit of $${stats.avgPnL.toFixed(2)} per trade`);
    } else {
        insights.keyInsights.push(`📉 Average loss of $${Math.abs(stats.avgPnL).toFixed(2)} per trade`);
    }
    
    insights.keyInsights.push(`📈 Analyzed ${stats.totalTrades} closed trades`);
    
    // Patterns
    const mostCommonEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
    if (mostCommonEmotion) {
        insights.patterns.push(`🧠 You trade most often when feeling "${mostCommonEmotion[0]}" (${mostCommonEmotion[1]} times)`);
    }
    
    const symbols = {};
    trades.forEach(t => {
        symbols[t.symbol] = (symbols[t.symbol] || 0) + 1;
    });
    const favSymbol = Object.entries(symbols).sort((a, b) => b[1] - a[1])[0];
    if (favSymbol) {
        insights.patterns.push(`📊 ${favSymbol[0]} is your most traded symbol (${favSymbol[1]} trades)`);
    }
    
    const longTrades = trades.filter(t => t.direction === 'long').length;
    const shortTrades = trades.filter(t => t.direction === 'short').length;
    if (longTrades > shortTrades * 2) {
        insights.patterns.push(`📈 You heavily favor long positions (${longTrades} long vs ${shortTrades} short)`);
    } else if (shortTrades > longTrades * 2) {
        insights.patterns.push(`📉 You heavily favor short positions (${shortTrades} short vs ${longTrades} long)`);
    } else {
        insights.patterns.push(`⚖️ Balanced approach between long and short positions`);
    }
    
    // Recommendations
    if (stats.winRate < 50) {
        insights.recommendations.push(`🎯 Focus on quality over quantity - wait for high-probability setups`);
        insights.recommendations.push(`📚 Review your losing trades and identify common mistakes`);
    }
    
    if (emotionCounts['Fearful'] > emotionCounts['Confident']) {
        insights.recommendations.push(`😰 You're trading with fear - consider reducing position sizes to build confidence`);
    }
    
    if (emotionCounts['Greedy'] >= 3) {
        insights.recommendations.push(`🚨 Greed detected in multiple trades - stick to your profit targets`);
    }
    
    if (stats.avgPnL > 0 && stats.winRate >= 50) {
        insights.recommendations.push(`✅ You're profitable! Focus on consistency and risk management`);
        insights.recommendations.push(`📊 Consider scaling up position sizes gradually`);
    }
    
    // Analyze user's trading rules adherence
    if (userRules && userRules.length > 0) {
        const rulesByCategory = {};
        userRules.forEach(r => {
            if (!rulesByCategory[r.category]) rulesByCategory[r.category] = [];
            rulesByCategory[r.category].push(r);
        });
        
        // Show active rules count
        insights.patterns.push(`📋 You're tracking ${userRules.length} active trading rules`);
        
        // Highlight most violated rules
        const mostViolatedRules = userRules
            .filter(r => r.times_violated > 0)
            .sort((a, b) => b.times_violated - a.times_violated)
            .slice(0, 2);
        
        if (mostViolatedRules.length > 0) {
            mostViolatedRules.forEach(rule => {
                insights.recommendations.push(`⚠️ Most violated: "${rule.rule}" (${rule.times_violated} violations)`);
            });
        }
        
        // Show best followed rules
        const bestFollowedRules = userRules
            .filter(r => r.times_followed > 0 && r.times_violated === 0)
            .sort((a, b) => b.times_followed - a.times_followed)
            .slice(0, 1);
        
        if (bestFollowedRules.length > 0) {
            insights.recommendations.push(`✅ Perfect adherence: "${bestFollowedRules[0].rule}" (${bestFollowedRules[0].times_followed} times)`);
        }
        
        // Calculate overall rule adherence rate
        const totalFollowed = userRules.reduce((sum, r) => sum + (r.times_followed || 0), 0);
        const totalViolated = userRules.reduce((sum, r) => sum + (r.times_violated || 0), 0);
        const totalRuleEvents = totalFollowed + totalViolated;
        
        if (totalRuleEvents > 0) {
            const adherenceRate = (totalFollowed / totalRuleEvents * 100).toFixed(1);
            const adherenceColor = adherenceRate >= 80 ? '🟢' : adherenceRate >= 60 ? '🟡' : '🔴';
            insights.keyInsights.push(`${adherenceColor} Rule Adherence: ${adherenceRate}% (${totalFollowed} followed, ${totalViolated} violated)`);
            
            if (adherenceRate < 70) {
                insights.recommendations.push(`🎯 Focus on improving rule adherence - currently at ${adherenceRate}%`);
            }
        }
    } else {
        insights.recommendations.push(`📋 Set up trading rules in the RuleGuard to track discipline`);
    }
    
    insights.recommendations.push(`📝 Always log your trades immediately to maintain accurate records`);
    insights.recommendations.push(`🔄 Review this analysis weekly to track improvement`);
    
    return insights;
}

function displayAIAnalysis(analysis) {
    // Show insights container
    document.getElementById('aiInsights').style.display = 'block';
    document.getElementById('aiEmptyState').style.display = 'none';
    
    // Display key insights
    const insightsEl = document.getElementById('aiInsightsContent');
    insightsEl.innerHTML = analysis.keyInsights.map(insight => 
        `<div style="margin-bottom: 0.75rem; padding-left: 1rem; border-left: 2px solid var(--primary);">${insight}</div>`
    ).join('');
    
    // Display patterns
    const patternsEl = document.getElementById('aiPatterns');
    patternsEl.innerHTML = analysis.patterns.map(pattern => 
        `<div style="margin-bottom: 0.75rem; padding-left: 1rem; border-left: 2px solid #2196F3;">${pattern}</div>`
    ).join('');
    
    // Display recommendations
    const recsEl = document.getElementById('aiRecommendations');
    recsEl.innerHTML = analysis.recommendations.map(rec => 
        `<div style="margin-bottom: 0.75rem; padding-left: 1rem; border-left: 2px solid #4CAF50;">${rec}</div>`
    ).join('');
}

// Export to global
window.generateAIAnalysis = generateAIAnalysis;
