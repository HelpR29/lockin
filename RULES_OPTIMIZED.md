# Optimized Trading Rules (55 Rules)

## Cleaned up version - removed redundancies and similar rules

### Risk Management (10 rules) ✅
1. Never risk more than 2% of account per trade
2. Always use stop loss orders on every trade
3. Don't add to losing positions (no averaging down)
4. Maximum 3 open positions at once
5. Risk no more than 6% of account in total at any time
6. Use proper position sizing based on stop loss distance
7. Never use more than 2:1 leverage
8. Set maximum daily loss limit at 5% of account
9. Adjust position size based on volatility (ATR)
10. Review and adjust stop losses as trade moves in your favor

**REMOVED:**
- ❌ "Take profits at predetermined targets" - Moved to Exit Rules (duplicate)
- ❌ "Never risk more on one trade than you can afford to lose" - Too vague, covered by 2% rule

### Entry Rules (13 rules) ✅
1. Wait for confirmation before entering any trade
2. Only trade during market hours (9:30 AM - 4:00 PM ET)
3. No trading in first 15 minutes of market open
4. No trading in last 15 minutes before market close
5. Must have 3:1 minimum reward-to-risk ratio
6. Only enter trades that align with the trend
7. Confirm entry with volume analysis
8. Check multiple timeframes before entry
9. Wait for pullback to support/resistance in trending markets
10. Avoid trading during major news events unless planned
11. Look for confluence of at least 2 technical indicators
12. Avoid chasing breakouts - wait for retest
13. Only trade setups you have backtested

**REMOVED:**
- ❌ "Enter only when you have a clear plan" - Too vague, covered by other rules
- ❌ "Check correlation with market indices before entry" - Too advanced/specific

### Exit Rules (10 rules) ✅
1. Always take profits at predetermined targets
2. Move stop to breakeven after 50% of profit target hit
3. Exit immediately if trade thesis is invalidated
4. Don't hold overnight unless specifically planned
5. Trail stops on winning trades
6. Exit before major economic announcements
7. Scale out at multiple profit targets
8. Never move stop loss further away from entry
9. Exit when price action becomes choppy/unclear
10. Exit all positions before long weekends/holidays

**REMOVED:**
- ❌ "Take partial profits at first target, let rest run" - Duplicate of "Scale out at multiple targets"
- ❌ "Don't let winners turn into losers - lock in profits" - Covered by "Take profits at targets"

### Psychology (11 rules) ✅
1. No revenge trading after a loss
2. Take a break after 2 consecutive losses
3. Don't trade when emotional, stressed, or tired
4. Journal every trade with emotions and reasoning
5. Accept that losses are part of trading
6. Don't overtrade - quality over quantity
7. Don't check positions obsessively - trust your plan
8. Stay humble - market can change anytime
9. Don't compare yourself to other traders
10. Focus on process, not just profits
11. Meditate or exercise before trading session

**REMOVED:**
- ❌ "Avoid trading when angry or frustrated" - Covered by "Don't trade when emotional"
- ❌ "Never trade to 'make back' losses quickly" - Duplicate of "No revenge trading"
- ❌ "Celebrate small wins, learn from all trades" - Nice but not critical
- ❌ "Take breaks during losing streaks" - Similar to "Take break after 2 losses"

### General (11 rules) ✅
1. Follow your trading plan always
2. Review all trades weekly
3. No FOMO (Fear of Missing Out) trading
4. Keep risk-reward ratio consistent
5. Test new strategies before live trading (backtest + paper trade)
6. Review and update trading plan monthly
7. Track all metrics and statistics
8. Never trade based on tips or rumors
9. Do your own analysis before every trade
10. Set realistic goals and expectations
11. Stay disciplined even during winning streaks

**REMOVED:**
- ❌ "Maintain detailed trading journal" - Duplicate of Psychology rule
- ❌ "Backtest new strategies" + "Paper trade new strategies" - MERGED into one rule
- ❌ "Continuously educate yourself about markets" - Vague, not actionable
- ❌ "Stick to your watchlist - don't chase random stocks" - Covered by FOMO rule
- ❌ "Never trade with money you can't afford to lose" - Should be assumed

---

## Summary of Changes

**Before:** 70 rules (12+15+12+15+16)
**After:** 55 rules (10+13+10+11+11)

**Removed:** 15 redundant/similar rules
**Merged:** 2 rules combined into 1

### Categories of Removals:
- **Duplicates:** 3 rules (journal, take profits, testing)
- **Similar/Overlapping:** 8 rules (emotional trading, revenge trading, breaks, profit-taking)
- **Too Vague:** 3 rules (clear plan, can't afford to lose, educate yourself)
- **Nice-to-Have:** 1 rule (celebrate wins)

### Benefits of Optimized List:
✅ More focused and actionable
✅ No confusion from similar rules
✅ Easier to select during onboarding
✅ Better for tracking adherence
✅ More professional/curated feel

---

## Recommended Implementation

Replace the 70-rule list in `onboarding.js` with this optimized 55-rule version to:
1. Reduce decision fatigue during onboarding
2. Eliminate redundancy confusion
3. Make tracking more meaningful
4. Improve user experience
5. Maintain comprehensive coverage

Each rule is now distinct, actionable, and valuable!
