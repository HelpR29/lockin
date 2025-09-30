# 🛡️ Trading Rules System - Setup Guide

## Overview
Your LockIn app now has a comprehensive **Trading Rules System** with 5 key categories and 20+ pre-defined rule templates.

## 📋 Rule Categories

### 1. 🛡️ Risk Management
Protect your capital and manage position sizing.

**Rules Include:**
- Never risk more than 1-2% per trade
- Always set stop loss before entry
- Minimum 1:2 Risk-to-Reward ratio
- Stop trading if drawdown > 8% in a week

### 2. 📊 Trade Limits
Control trading frequency and prevent overtrading.

**Rules Include:**
- Max 3 trades per day
- Max 10 trades per week
- Stop after 2 consecutive losses
- Only 1 open position per asset

### 3. ✨ Setup Quality
Ensure high-quality trade setups only.

**Rules Include:**
- Only trade with clear confirmation (multiple indicators)
- No trading during high-impact news
- Trade only during optimal hours
- Avoid counter-trend unless A+ setup

### 4. 🧘 Emotional Discipline
Maintain psychological control while trading.

**Rules Include:**
- No revenge trading after loss
- No increasing size after losing trade
- Stop when daily goal is hit
- Walk away after 3 straight losses

### 5. 📝 Journaling & Review
Track and analyze your performance systematically.

**Rules Include:**
- Log every trade completely
- Write 1 lesson learned per session
- Daily review before logging off
- Weekly discipline score review

## 🚀 Setup Instructions

### Step 1: Update Your Database
Run the updated `database_schema.sql` in your Supabase SQL Editor:

```bash
# The schema now includes:
# - rule_categories table (5 default categories)
# - rule_templates table (20+ pre-defined templates)
# - user_defined_rules table (your personal rules)
# - rule_violations table (track when rules are broken)
```

### Step 2: Access Rules Page
Navigate to: **http://localhost:8000/rules.html**

Or from the dashboard: **Click "⚙️ Rules" in the navigation**

### Step 3: Add Rules from Templates
1. Click "**Add from Template**" button
2. Browse through all 5 categories
3. Click "**+ Add**" on any rule you want to use
4. Rules are instantly added to your active ruleset

### Step 4: Customize Rules
- Toggle rules on/off with the switch
- Edit rule text to personalize
- Add custom rules with "**+ Add Custom Rule**"
- Track adherence % automatically

## 📊 Features

### Rule Tracking
Each rule shows:
- **✓ Times Followed**: How many times you followed the rule
- **✗ Times Violated**: How many times you broke it
- **Adherence %**: Automatic calculation of discipline score
- **Color-coded**: Green (90%+), Yellow (70-89%), Red (<70%)

### Numeric Rules
Some rules have values (e.g., "2%", "3 trades"):
- Displayed as badges on the rule
- Can be customized
- Used for automated checking

### Categories & Organization
- Rules organized by category with icons
- Category descriptions for context
- Easy navigation and management

## 🎯 How to Use

### Daily Workflow
1. **Before Trading**: Review your active rules
2. **During Trading**: Follow your ruleset
3. **After Each Trade**: Log if rules were followed/violated
4. **End of Day**: Check adherence % across all rules

### Weekly Review
1. Check overall discipline score
2. Identify which rules are hardest to follow
3. Adjust or remove rules that don't work
4. Add new rules based on lessons learned

## 🔒 Rule Enforcement

### Automatic Tracking
- Linked to trades table
- Can log violations with notes
- Severity levels (low, medium, high)
- Historical violation log

### Manual Tracking
- Mark rule violations manually
- Add notes about why it was broken
- Review violation history
- Learn from patterns

## 📈 Benefits

1. **Consistency**: Follow your trading plan every day
2. **Accountability**: Track when you break your own rules
3. **Improvement**: Identify weak areas and improve
4. **Discipline**: Build mental discipline through tracking
5. **Success**: More disciplined = more profitable

## 🎨 UI Features

- **Modern Design**: Beautiful, futuristic interface
- **Easy Management**: Toggle, edit, delete with ease
- **Template Library**: 20+ pre-made rules to start with
- **Custom Rules**: Add your own specific rules
- **Visual Feedback**: Color-coded adherence indicators

## 💡 Tips

1. Start with 5-7 core rules (don't overwhelm yourself)
2. Add rules gradually as you master existing ones
3. Be honest about violations (it's for your benefit)
4. Review weekly and adjust what's not working
5. Celebrate high adherence % (90%+ is excellent!)

## 🔄 Next Steps

After rules are set up, you can:
- Link rules to trades (coming soon: automatic violation detection)
- Set up alerts when rules are broken
- Generate rule adherence reports
- Track discipline score over time

---

**Your trading discipline starts with clear rules. LockIn helps you follow them!** 🎯
