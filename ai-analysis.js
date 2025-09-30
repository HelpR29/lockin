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
        
        // Generate AI analysis
        const analysis = await analyzeWithAI(trades, stats);
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
    const closedTrades = trades.filter(t => t.status === 'closed' && t.exit_price);
    
    closedTrades.forEach(trade => {
        const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * (trade.direction === 'short' ? -1 : 1);
        totalPnL += pnl;
        if (pnl > 0) wins++;
        else if (pnl < 0) losses++;
    });
    
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100) : 0;
    const avgPnL = totalTrades > 0 ? (totalPnL / totalTrades) : 0;
    
    return {
        totalTrades,
        wins,
        losses,
        winRate,
        avgPnL,
        totalPnL,
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

async function analyzeWithAI(trades, stats) {
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
    const insights = generateLocalInsights(trades, stats, emotionCounts);
    
    return insights;
}

function generateLocalInsights(trades, stats, emotionCounts) {
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
