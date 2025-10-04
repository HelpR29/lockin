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
        renderDisciplineScore(trades, rules, violations);
        renderPsychologyInsights(trades, violations);
        renderRulesPerformance(trades, rules, violations);
    } catch (error) {
        console.error('Error generating psychology report:', error);
    }
}

// 1. Rule Adherence Overview
function renderRuleAdherenceSection(rules, violations) {
    const container = document.getElementById('ruleAdherenceSection');
    if (!container) return;

    const totalRules = rules.filter(r => r.is_active).length;
    const totalFollowed = rules.reduce((sum, r) => sum + (r.times_followed || 0), 0);
    const violationsFromRecords = violations.length;
    const violationsFromCounters = rules.reduce((sum, r) => sum + (r.times_violated || 0), 0);
    const totalViolated = Math.max(violationsFromRecords, violationsFromCounters);
    
    const adherenceRate = totalFollowed + totalViolated > 0 
        ? ((totalFollowed / (totalFollowed + totalViolated)) * 100).toFixed(1)
        : 100;

    // Group violations by rule (prefer records; fallback to counters)
    const violationsByRule = {};
    if (violationsFromRecords > 0) {
        violations.forEach(v => {
            const ruleName = v.trading_rules?.rule || 'Unknown';
            violationsByRule[ruleName] = (violationsByRule[ruleName] || 0) + 1;
        });
    } else {
        rules.filter(r => (r.times_violated || 0) > 0).forEach(r => {
            violationsByRule[r.rule] = (violationsByRule[r.rule] || 0) + (r.times_violated || 0);
        });
    }

    const topViolations = Object.entries(violationsByRule)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    container.innerHTML = `
        <div class="psychology-card">
            <h3 data-tooltip="How well you follow your trading rules.">📋 Rule Adherence</h3>
            <div class="stat-grid">
                <div class="stat-item" data-tooltip="Overall adherence = Times followed / (Times followed + Violations)" title="Overall adherence = Followed / (Followed + Violations)">
                    <div class="stat-value" style="color: ${adherenceRate >= 90 ? '#34C759' : adherenceRate >= 70 ? '#FFC107' : '#FF453A'};">
                        ${adherenceRate}%
                    </div>
                    <div class="stat-label">Overall Adherence</div>
                </div>
                <div class="stat-item" data-tooltip="Number of rules currently enabled" title="Active rules enabled">
                    <div class="stat-value">${totalRules}</div>
                    <div class="stat-label">Active Rules</div>
                </div>
                <div class="stat-item" data-tooltip="Total times a rule was explicitly marked as followed" title="Times rules were followed">
                    <div class="stat-value" style="color: #34C759;">${totalFollowed}</div>
                    <div class="stat-label">Times Followed</div>
                </div>
                <div class="stat-item" data-tooltip="Number of violations recorded across your rules (from logs or counters)" title="Total rule violations">
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
            <h3 data-tooltip="Sentiment inferred from your trade notes (keywords)">🧠 Emotional State Analysis</h3>
            <div class="stat-grid">
                <div class="stat-item" data-tooltip="Percent of trades whose notes contain positive language" title="Positive emotion rate">
                    <div class="stat-value" style="color: ${emotionalScore >= 70 ? '#34C759' : emotionalScore >= 50 ? '#FFC107' : '#FF453A'};">
                        ${emotionalScore}%
                    </div>
                    <div class="stat-label">Positive Emotion Rate</div>
                </div>
                <div class="stat-item" data-tooltip="Trades with notes that include positive keywords (e.g., confident, calm)" title="Positive trades">
                    <div class="stat-value" style="color: #34C759;">${positiveCount}</div>
                    <div class="stat-label">Positive Trades</div>
                </div>
                <div class="stat-item" data-tooltip="Trades with notes that include negative keywords (e.g., anxious, greedy)" title="Negative trades">
                    <div class="stat-value" style="color: #FF453A;">${negativeCount}</div>
                    <div class="stat-label">Negative Trades</div>
                </div>
                <div class="stat-item" data-tooltip="Trades with notes but neither positive nor negative keywords detected" title="Neutral trades">
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
function renderDisciplineScore(trades, rules, violations) {
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
    const violationsFromRecords = violations.length;
    const violationsFromCounters = (rules || []).reduce((sum, r) => sum + (r.times_violated || 0), 0);
    const violationsCount = Math.max(violationsFromRecords, violationsFromCounters);
    const violationRate = closedTrades.length > 0 ? (violationsCount / closedTrades.length) * 100 : 0;

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
            <h3 data-tooltip="Weighted score of your trading discipline (stops, targets, journaling, violations)">⭐ Discipline Score</h3>
            <div style="text-align: center; margin: 2rem 0;">
                <div style="font-size: 4rem; font-weight: 900; color: ${scoreColor};">
                    ${disciplineScore}
                </div>
                <div style="font-size: 2rem; font-weight: 700; color: ${scoreColor}; margin-top: -1rem;">
                    Grade: ${scoreGrade}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div style="text-align: center; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 12px;" data-tooltip="Share of closed trades with a stop loss set" title="Stop loss usage">
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${stopLossRate >= 90 ? '#34C759' : '#FFC107'};">
                        ${stopLossRate.toFixed(0)}%
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Stop Loss Usage</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 12px;" data-tooltip="Share of closed trades with a profit target set" title="Target setting rate">
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${targetRate >= 90 ? '#34C759' : '#FFC107'};">
                        ${targetRate.toFixed(0)}%
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Target Setting</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 12px;" data-tooltip="Share of closed trades with detailed notes (≥ 10 characters)" title="Trade journaling rate">
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${journalRate >= 90 ? '#34C759' : '#FFC107'};">
                        ${journalRate.toFixed(0)}%
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Trade Journaling</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 12px;" data-tooltip="Total rule violations logged across all trades" title="Rule violations count">
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${violationRate <= 10 ? '#34C759' : '#FF453A'};">
                        ${violationsCount}
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
        const dir1 = (prevTrade.direction || '').toLowerCase() === 'short' ? -1 : 1;
        const prevPnL = (prevTrade.exit_price - prevTrade.entry_price) * prevTrade.position_size * mult1 * dir1;
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
            <h3 data-tooltip="Automated highlights based on your trading behavior and rule activity">💡 Psychology Insights</h3>
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

// Export to global scope
window.generatePsychologyReport = generatePsychologyReport;

// 5. Rules Performance Breakdown (new detailed section)
function renderRulesPerformance(trades, rules, violations) {
    const container = document.getElementById('rulesPerformanceSection');
    if (!container) return;

    // Calculate detailed stats per rule
    const ruleStats = rules.filter(r => r.is_active).map(rule => {
        const ruleViolations = violations.filter(v => v.rule_id === rule.id);
        const followed = rule.times_followed || 0;
        const violated = Math.max(ruleViolations.length, rule.times_violated || 0);
        const total = followed + violated;
        const adherenceRate = total > 0 ? ((followed / total) * 100) : 100;
        
        return {
            id: rule.id,
            category: rule.category || 'General',
            rule: rule.rule,
            followed,
            violated,
            total,
            adherenceRate
        };
    });

    // Sort by adherence rate (worst first for attention)
    const worstRules = [...ruleStats].sort((a, b) => a.adherenceRate - b.adherenceRate).slice(0, 5);
    const bestRules = [...ruleStats].filter(r => r.total > 0).sort((a, b) => b.adherenceRate - a.adherenceRate).slice(0, 5);

    // Group by category
    const byCategory = {};
    ruleStats.forEach(r => {
        if (!byCategory[r.category]) byCategory[r.category] = { followed: 0, violated: 0, total: 0 };
        byCategory[r.category].followed += r.followed;
        byCategory[r.category].violated += r.violated;
        byCategory[r.category].total += r.total;
    });

    container.innerHTML = `
        <div class="psychology-card">
            <h3>📊 Rules Performance Breakdown</h3>
            
            <!-- Category Summary -->
            <div style="margin-bottom: 2rem;">
                <h4 style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">Performance by Category:</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
                    ${Object.entries(byCategory).map(([cat, stats]) => {
                        const rate = stats.total > 0 ? ((stats.followed / stats.total) * 100).toFixed(0) : 100;
                        const color = rate >= 90 ? '#34C759' : rate >= 70 ? '#FFC107' : '#FF453A';
                        return `
                            <div style="padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 10px; text-align: center;">
                                <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.25rem;">${cat}</div>
                                <div style="font-size: 1.5rem; font-weight: 700; color: ${color};">${rate}%</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Top Issues -->
            ${worstRules.length > 0 && worstRules[0].total > 0 ? `
                <div style="margin-bottom: 2rem;">
                    <h4 style="margin-bottom: 1rem; color: #FF453A; font-size: 0.9rem;">🚨 Rules Needing Attention:</h4>
                    ${worstRules.map(r => {
                        const color = r.adherenceRate >= 70 ? '#FFC107' : '#FF453A';
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: rgba(255,69,58,0.08); border-left: 3px solid ${color}; border-radius: 8px; margin-bottom: 0.5rem;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; margin-bottom: 0.25rem;">${r.rule}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${r.category}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.25rem; font-weight: 700; color: ${color};">${r.adherenceRate.toFixed(0)}%</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${r.followed}/${r.total}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : ''}

            <!-- Top Performers -->
            ${bestRules.length > 0 ? `
                <div>
                    <h4 style="margin-bottom: 1rem; color: #34C759; font-size: 0.9rem;">✅ Rules You Follow Best:</h4>
                    ${bestRules.map(r => {
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: rgba(52,199,89,0.08); border-left: 3px solid #34C759; border-radius: 8px; margin-bottom: 0.5rem;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; margin-bottom: 0.25rem;">${r.rule}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${r.category}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.25rem; font-weight: 700; color: #34C759;">${r.adherenceRate.toFixed(0)}%</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${r.followed}/${r.total}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : ''}
        </div>
    `;
}
