// Psychology & Discipline Reports - The Most Important Metrics

async function generatePsychologyReport() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch all necessary data
        const [tradesRes, rulesRes, violationsRes] = await Promise.all([
            supabase.from('trades').select('*').eq('user_id', user.id),
            supabase.from('trading_rules').select('*').eq('user_id', user.id),
            supabase.from('rule_violations').select('*, trading_rules(rule)').eq('user_id', user.id)
        ]);

        const trades = tradesRes.data || [];
        const rules = rulesRes.data || [];
        const violations = violationsRes.data || [];

        console.log('📊 Psychology Report Data:', { trades: trades.length, rules: rules.length, violations: violations.length });

        // Render all sections
        renderRuleAdherenceSection(rules, violations);
        renderEmotionalAnalysis(trades);
        renderDisciplineScore(trades, violations);
        renderPsychologyInsights(trades, violations);
    } catch (error) {
        console.error('Error generating psychology report:', error);
    }
}

// 1. Rule Adherence Overview
function renderRuleAdherenceSection(rules, violations) {
    const container = document.getElementById('ruleAdherenceSection');
    if (!container) return;

    const totalRules = rules.filter(r => r.is_active).length;
    const totalViolations = violations.length; // Use actual violation records
    const totalFollowed = rules.reduce((sum, r) => sum + (r.times_followed || 0), 0);
    const totalViolated = violations.length; // Use actual violation records (not counter)
    
    const adherenceRate = totalFollowed + totalViolated > 0 
        ? ((totalFollowed / (totalFollowed + totalViolated)) * 100).toFixed(1)
        : 100;

    // Group violations by rule
    const violationsByRule = {};
    violations.forEach(v => {
        const ruleName = v.trading_rules?.rule || 'Unknown';
        violationsByRule[ruleName] = (violationsByRule[ruleName] || 0) + 1;
    });

    const topViolations = Object.entries(violationsByRule)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    container.innerHTML = `
        <div class="psychology-card">
            <h3>📋 Rule Adherence</h3>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-value" style="color: ${adherenceRate >= 90 ? '#34C759' : adherenceRate >= 70 ? '#FFC107' : '#FF453A'};">
                        ${adherenceRate}%
                    </div>
                    <div class="stat-label">Overall Adherence</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalRules}</div>
                    <div class="stat-label">Active Rules</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #34C759;">${totalFollowed}</div>
                    <div class="stat-label">Times Followed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #FF453A;">${totalViolated}</div>
                    <div class="stat-label">Times Violated</div>
                </div>
            </div>
            
            ${topViolations.length > 0 ? `
                <div style="margin-top: 2rem;">
                    <h4 style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">⚠️ Most Broken Rules:</h4>
                    ${topViolations.map(([rule, count]) => `
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: rgba(255, 69, 58, 0.1); border-left: 3px solid #FF453A; border-radius: 8px; margin-bottom: 0.5rem;">
                            <span>${rule}</span>
                            <span style="font-weight: 700; color: #FF453A;">${count}×</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// 2. Emotional Analysis from Trade Notes
function renderEmotionalAnalysis(trades) {
    const container = document.getElementById('emotionalAnalysisSection');
    if (!container) return;

    // Emotion keywords
    const emotions = {
        positive: ['confident', 'patient', 'calm', 'disciplined', 'good', 'great', 'perfect', 'solid'],
        negative: ['anxious', 'scared', 'greedy', 'fomo', 'revenge', 'angry', 'frustrated', 'nervous', 'rushed'],
        neutral: ['okay', 'normal', 'standard', 'routine']
    };

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    const emotionalTrades = [];

    trades.forEach(trade => {
        const notes = (trade.notes || '').toLowerCase();
        let sentiment = 'neutral';
        
        if (emotions.positive.some(word => notes.includes(word))) {
            positiveCount++;
            sentiment = 'positive';
        } else if (emotions.negative.some(word => notes.includes(word))) {
            negativeCount++;
            sentiment = 'negative';
        } else if (notes.length > 0) {
            neutralCount++;
        }

        if (sentiment !== 'neutral' && notes.length > 0) {
            emotionalTrades.push({ trade, sentiment, notes: trade.notes });
        }
    });

    const totalEmotional = positiveCount + negativeCount + neutralCount;
    const emotionalScore = totalEmotional > 0 
        ? ((positiveCount / totalEmotional) * 100).toFixed(1)
        : 0;

    container.innerHTML = `
        <div class="psychology-card">
            <h3>🧠 Emotional State Analysis</h3>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-value" style="color: ${emotionalScore >= 70 ? '#34C759' : emotionalScore >= 50 ? '#FFC107' : '#FF453A'};">
                        ${emotionalScore}%
                    </div>
                    <div class="stat-label">Positive Emotion Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #34C759;">${positiveCount}</div>
                    <div class="stat-label">Positive Trades</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #FF453A;">${negativeCount}</div>
                    <div class="stat-label">Negative Trades</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${neutralCount}</div>
                    <div class="stat-label">Neutral Trades</div>
                </div>
            </div>
            
            <div style="margin-top: 1.5rem;">
                <div style="height: 200px;">
                    <canvas id="emotionChart"></canvas>
                </div>
            </div>
        </div>
    `;

    // Render emotion pie chart
    const canvas = document.getElementById('emotionChart');
    if (canvas && (positiveCount + negativeCount + neutralCount) > 0) {
        new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Positive 😊', 'Negative 😤', 'Neutral 😐'],
                datasets: [{
                    data: [positiveCount, negativeCount, neutralCount],
                    backgroundColor: ['#34C759', '#FF453A', '#8E8E93'],
                    borderColor: '#2C2C2E',
                    borderWidth: 4
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// 3. Discipline Score
function renderDisciplineScore(trades, violations) {
    const container = document.getElementById('disciplineScoreSection');
    if (!container) return;

    const closedTrades = trades.filter(t => t.status === 'closed');
    
    // Calculate discipline factors
    const hasStopLoss = closedTrades.filter(t => t.stop_loss && t.stop_loss > 0).length;
    const hasTarget = closedTrades.filter(t => t.target_price && t.target_price > 0).length;
    const hasNotes = closedTrades.filter(t => t.notes && t.notes.length > 10).length;
    
    const stopLossRate = closedTrades.length > 0 ? (hasStopLoss / closedTrades.length) * 100 : 0;
    const targetRate = closedTrades.length > 0 ? (hasTarget / closedTrades.length) * 100 : 0;
    const journalRate = closedTrades.length > 0 ? (hasNotes / closedTrades.length) * 100 : 0;
    const violationRate = closedTrades.length > 0 ? (violations.length / closedTrades.length) * 100 : 0;

    // Overall discipline score (weighted average)
    const disciplineScore = (
        stopLossRate * 0.3 + 
        targetRate * 0.2 + 
        journalRate * 0.2 + 
        (100 - violationRate) * 0.3
    ).toFixed(1);

    const scoreColor = disciplineScore >= 80 ? '#34C759' : disciplineScore >= 60 ? '#FFC107' : '#FF453A';
    const scoreGrade = disciplineScore >= 90 ? 'A+' : disciplineScore >= 80 ? 'A' : disciplineScore >= 70 ? 'B' : disciplineScore >= 60 ? 'C' : 'D';

    container.innerHTML = `
        <div class="psychology-card">
            <h3>⭐ Discipline Score</h3>
            <div style="text-align: center; margin: 2rem 0;">
                <div style="font-size: 4rem; font-weight: 900; color: ${scoreColor};">
                    ${disciplineScore}
                </div>
                <div style="font-size: 2rem; font-weight: 700; color: ${scoreColor}; margin-top: -1rem;">
                    Grade: ${scoreGrade}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div style="text-align: center; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 12px;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${stopLossRate >= 90 ? '#34C759' : '#FFC107'};">
                        ${stopLossRate.toFixed(0)}%
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Stop Loss Usage</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 12px;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${targetRate >= 90 ? '#34C759' : '#FFC107'};">
                        ${targetRate.toFixed(0)}%
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Target Setting</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 12px;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${journalRate >= 90 ? '#34C759' : '#FFC107'};">
                        ${journalRate.toFixed(0)}%
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Trade Journaling</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 12px;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${violationRate <= 10 ? '#34C759' : '#FF453A'};">
                        ${violations.length}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Rule Violations</div>
                </div>
            </div>
        </div>
    `;
}

// 4. Psychology Insights
function renderPsychologyInsights(trades, violations) {
    const container = document.getElementById('psychologyInsightsSection');
    if (!container) return;

    const insights = [];
    const closedTrades = trades.filter(t => t.status === 'closed');

    // Check for revenge trading pattern
    let revengeTrades = 0;
    for (let i = 1; i < closedTrades.length; i++) {
        const prevTrade = closedTrades[i - 1];
        const currTrade = closedTrades[i];
        const isOption1 = prevTrade.trade_type === 'call' || prevTrade.trade_type === 'put';
        const isOption2 = currTrade.trade_type === 'call' || currTrade.trade_type === 'put';
        const mult1 = isOption1 ? 100 : 1;
        const mult2 = isOption2 ? 100 : 1;
        const prevPnL = (prevTrade.exit_price - prevTrade.entry_price) * prevTrade.position_size * mult1;
        const timeDiff = (new Date(currTrade.created_at) - new Date(prevTrade.created_at)) / (1000 * 60);
        
        if (prevPnL < 0 && timeDiff < 60) {
            revengeTrades++;
        }
    }

    if (revengeTrades > 0) {
        insights.push({
            icon: '😤',
            type: 'warning',
            title: 'Revenge Trading Detected',
            message: `${revengeTrades} potential revenge trade(s) within 1 hour of a loss. Take breaks after losses!`
        });
    }

    // Check stop loss discipline
    const noStopLoss = closedTrades.filter(t => !t.stop_loss || t.stop_loss === 0).length;
    if (noStopLoss > closedTrades.length * 0.2) {
        insights.push({
            icon: '🛑',
            type: 'warning',
            title: 'Missing Stop Losses',
            message: `${noStopLoss} trades without stop losses. Always protect your capital!`
        });
    }

    // Check journaling
    const noNotes = closedTrades.filter(t => !t.notes || t.notes.length < 10).length;
    if (noNotes > closedTrades.length * 0.3) {
        insights.push({
            icon: '📝',
            type: 'info',
            title: 'Journal More',
            message: `${noNotes} trades missing detailed notes. Journaling improves self-awareness!`
        });
    }

    // Positive insights
    if (violations.length === 0 && closedTrades.length > 0) {
        insights.push({
            icon: '✅',
            type: 'success',
            title: 'Perfect Discipline!',
            message: 'Zero rule violations! You\'re trading with excellent discipline. Keep it up!'
        });
    }

    container.innerHTML = `
        <div class="psychology-card">
            <h3>💡 Psychology Insights</h3>
            ${insights.length > 0 ? insights.map(insight => `
                <div style="padding: 1rem; margin-bottom: 0.75rem; background: ${
                    insight.type === 'success' ? 'rgba(52, 199, 89, 0.1)' : 
                    insight.type === 'warning' ? 'rgba(255, 69, 58, 0.1)' : 
                    'rgba(255, 193, 7, 0.1)'
                }; border-left: 3px solid ${
                    insight.type === 'success' ? '#34C759' : 
                    insight.type === 'warning' ? '#FF453A' : 
                    '#FFC107'
                }; border-radius: 8px;">
                    <div style="display: flex; align-items: start; gap: 1rem;">
                        <span style="font-size: 2rem;">${insight.icon}</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 0.25rem;">${insight.title}</div>
                            <div style="color: var(--text-secondary); font-size: 0.875rem;">${insight.message}</div>
                        </div>
                    </div>
                </div>
            `).join('') : `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎯</div>
                    <p>Keep trading to generate insights!</p>
                </div>
            `}
        </div>
    `;
}

// Export to global
window.generatePsychologyReport = generatePsychologyReport;
