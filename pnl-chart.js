// P&L Chart and Progress Tracking

let pnlChart = null;

// Initialize P&L chart
document.addEventListener('DOMContentLoaded', async () => {
    await initializePnLChart();
});

async function initializePnLChart() {
    const canvas = document.getElementById('pnlChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Create Chart.js line chart
    pnlChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Cumulative P&L',
                data: [],
                borderColor: '#FF9500',
                backgroundColor: 'rgba(255, 149, 0, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#FF9500',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(28, 28, 30, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#FF9500',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return 'P&L: $' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)',
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)',
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Update P&L chart with trade data
async function updatePnLChart() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Get all closed trades sorted by date
        const { data: trades, error } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'closed')
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Error fetching trades:', error);
            return;
        }
        
        if (!trades || trades.length === 0) {
            // No trades yet
            updatePnLStats(0, 0, 0);
            if (pnlChart) {
                pnlChart.data.labels = ['Start'];
                pnlChart.data.datasets[0].data = [0];
                pnlChart.update();
            }
            return;
        }
        
        // Calculate cumulative P&L
        let cumulativePnL = 0;
        const labels = ['Start'];
        const data = [0];
        let totalWins = 0;
        let totalLosses = 0;
        
        trades.forEach((trade, index) => {
            const pnl = (trade.exit_price - trade.entry_price) * trade.position_size * (trade.direction === 'short' ? -1 : 1);
            cumulativePnL += pnl;
            
            // Track wins and losses
            if (pnl > 0) {
                totalWins += pnl;
            } else {
                totalLosses += Math.abs(pnl);
            }
            
            // Format label
            const date = new Date(trade.created_at);
            const label = `${date.getMonth() + 1}/${date.getDate()}`;
            
            labels.push(label);
            data.push(cumulativePnL);
        });
        
        // Update chart
        if (pnlChart) {
            pnlChart.data.labels = labels;
            pnlChart.data.datasets[0].data = data;
            pnlChart.update();
        }
        
        // Update stats
        updatePnLStats(totalWins, totalLosses, cumulativePnL);
        
        // Update progress tracker if there are profitable trades
        if (cumulativePnL > 0) {
            await updateProgressTracker(cumulativePnL);
        }
        
    } catch (error) {
        console.error('Error updating P&L chart:', error);
    }
}

function updatePnLStats(wins, losses, netPnl) {
    const totalWinsEl = document.getElementById('totalWins');
    const totalLossesEl = document.getElementById('totalLosses');
    const netPnlEl = document.getElementById('netPnl');
    
    if (totalWinsEl) {
        totalWinsEl.textContent = `$${wins.toFixed(2)}`;
    }
    
    if (totalLossesEl) {
        totalLossesEl.textContent = `$${losses.toFixed(2)}`;
    }
    
    if (netPnlEl) {
        netPnlEl.textContent = `$${netPnl.toFixed(2)}`;
        netPnlEl.style.color = netPnl >= 0 ? '#4CAF50' : '#F44336';
    }
}

// Update progress tracker when trades make profit
async function updateProgressTracker(cumulativePnL) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Get user goals
        const { data: goals } = await supabase
            .from('user_goals')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();
        
        if (!goals) return;
        
        // Calculate current capital
        const currentCapital = goals.starting_capital + cumulativePnL;
        
        // Calculate how many "glasses" have been cracked using COMPOUND formula
        // Formula: current = starting × (1 + percent)^n
        // Solve for n: n = log(current/starting) / log(1 + percent)
        const targetPercentPerBeer = goals.target_percent_per_beer / 100;
        const growthRatio = currentCapital / goals.starting_capital;
        const beersCracked = Math.floor(Math.log(growthRatio) / Math.log(1 + targetPercentPerBeer));
        
        // Update user_goals with current capital
        await supabase
            .from('user_goals')
            .update({
                current_capital: currentCapital,
                bottles_cracked: Math.min(beersCracked, goals.total_bottles),
                bottles_remaining: Math.max(0, goals.total_bottles - beersCracked)
            })
            .eq('user_id', user.id)
            .eq('is_active', true);
        
        // Get current progress to check if we leveled up
        const { data: currentProgress } = await supabase
            .from('user_progress')
            .select('beers_cracked, level, total_check_ins')
            .eq('user_id', user.id)
            .single();
        
        const previousGlasses = currentProgress?.beers_cracked || 0;
        const newGlassesCracked = beersCracked - previousGlasses;
        
        // Award XP for each new glass cracked (50 XP per glass)
        const xpPerGlass = 50;
        const xpToAdd = newGlassesCracked * xpPerGlass;
        
        // Update user_progress
        await supabase
            .from('user_progress')
            .update({
                beers_cracked: Math.min(beersCracked, goals.total_bottles),
                total_check_ins: (currentProgress?.total_check_ins || 0) + xpToAdd
            })
            .eq('user_id', user.id);
        
        // Send notifications for each new glass cracked
        if (newGlassesCracked > 0 && typeof createNotification === 'function') {
            await createNotification(
                'goal_reached',
                `${newGlassesCracked} Glass${newGlassesCracked > 1 ? 'es' : ''} Cracked!`,
                `You've cracked ${newGlassesCracked} glass${newGlassesCracked > 1 ? 'es' : ''}! +${xpToAdd} XP earned. Current: ${beersCracked}/${goals.total_bottles}`,
                '🍷',
                '/dashboard.html'
            );
        }
        
        console.log(`Progress updated: ${beersCracked} glasses cracked (+${newGlassesCracked} new), +${xpToAdd} XP, Current capital: $${currentCapital}`);
        
    } catch (error) {
        console.error('Error updating progress tracker:', error);
    }
}

// Export function
window.updatePnLChart = updatePnLChart;
