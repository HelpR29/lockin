# 🚀 Growth & Compounding System - Complete Guide

## Overview
The Growth & Compounding System is the **core gamification engine** of LockIn. It transforms trading discipline into a rewarding progression system with visual milestones, level advancement, and compounding benefits.

---

## 🎯 Core Components

### 1. Progress Objects (Visual Progression)
Users progress through 8 tiers of achievement:

| Tier | Object | Emoji | Min Completions | Multiplier |
|------|--------|-------|-----------------|------------|
| 1 | Beer | 🍺 | 0 | 1.0x |
| 2 | Wine | 🍷 | 10 | 1.15x |
| 3 | Donut | 🍩 | 25 | 1.30x |
| 4 | Diamond | 💎 | 50 | 1.50x |
| 5 | Trophy | 🏆 | 75 | 2.0x |
| 6 | Star | ⭐ | 90 | 2.5x |
| 7 | Medal | 🏅 | 95 | 3.0x |
| 8 | Coin | 🪙 | 99 | 4.0x |

**Purpose**: Visual representation of trading mastery progression

---

### 2. Level System
**XP-Based Progression:**
- Start at Level 1 with 0 XP
- XP required for next level increases exponentially
- Formula: `nextLevelXP = 100 * (1.5 ^ (level - 1))`

**XP Sources:**
- Daily Check-in: 10 base XP + streak bonus
- Discipline Rating: rating × 5 XP
- Trade Completion: 100 XP × object multiplier
- Achievements: 50 - 5000 XP per achievement

**Level Bonus:**
- Each level adds 5% to growth multiplier
- Formula: `levelBonus = 1.0 + (level * 0.05)`
- Level 10 = 1.5x bonus, Level 20 = 2.0x bonus

---

### 3. Streak System
**Consecutive Day Check-ins:**
| Streak Days | Multiplier |
|-------------|------------|
| < 3 days | 1.0x |
| 3-6 days | 1.1x |
| 7-13 days | 1.25x |
| 14-29 days | 1.5x |
| 30-59 days | 2.0x |
| 60-89 days | 2.5x |
| 90+ days | 3.0x |

**Streak Mechanics:**
- Check-in each day to maintain streak
- Missing a day resets streak to 0
- Longest streak tracked separately
- Streak bonus increases XP earned

---

### 4. Achievement System
**16 Built-in Achievements:**

**Milestones:**
- First Step (1 check-in) → 1.05x bonus
- Century Club (100 check-ins) → 1.5x bonus

**Streak Achievements:**
- Week Warrior (7 days) → 1.1x bonus
- Month Master (30 days) → 1.25x bonus

**Progress Achievements:**
- Beer Beginner → Coin Master
- Each tier unlocks a new achievement
- Multipliers compound: 1.05x to 4.0x

**Level Achievements:**
- Level 5 → 1.1x bonus
- Level 10 → 1.2x bonus
- Level 25 → 1.5x bonus

**Discipline Achievement:**
- Discipline Master (95+ score) → 1.4x bonus

---

## 💰 Compounding Formula

### Total Growth Calculation
```
Total Growth = Base Progress × Streak Multiplier × Level Bonus × Achievement Bonus
```

**Example:**
- Base Progress: 1.0
- Streak (30 days): 2.0x
- Level (10): 1.5x
- Achievements (5 unlocked): 1.8x
- **Total: 1.0 × 2.0 × 1.5 × 1.8 = 5.4x**

This means every action earns 5.4× more value than starting!

---

## 📊 User Progress Tracking

### Daily Check-ins
**Purpose**: Build consistency and maintain streaks

**What's Tracked:**
- Discipline rating (1-10 scale)
- Followed trading rules (yes/no)
- Traded today (yes/no)
- Number of trades
- Win rate and P/L
- Emotions and notes
- XP earned
- Current streak

**Benefits:**
- Earn base XP
- Maintain/build streak
- Track discipline score
- Unlock achievements

---

### Completions
**Purpose**: Mark milestone achievements (bottles/tokens)

**When to Complete:**
- Hit target % gain (e.g., 8% per user's goal)
- Complete a trading "bottle"
- Advance progress object tier

**Tracked Data:**
- Starting balance
- Ending balance
- Gain amount & percentage
- Number of trades
- Notes
- Token type used

---

## 🎮 How It Works (User Flow)

### Day 1: Sign Up
1. Complete onboarding
2. Set goals (e.g., $5k → $50k, 8% per completion)
3. Choose progress token (beer, wine, etc.)
4. Initialize at Level 1, 0 XP, Beer tier

### Daily Routine
1. **Morning**: Open app, see current progress
2. **Trading**: Follow rules, log trades
3. **Evening**: Daily check-in
   - Rate discipline (1-10)
   - Log if followed rules
   - Track wins/losses
   - Earn XP (10 + streak bonus + discipline bonus)

### Hitting a Milestone
1. Reach target % gain (e.g., 8%)
2. Log completion
3. **Unlock rewards:**
   - 100 XP × current object multiplier
   - Progress bar advances
   - May tier up to next object
   - Unlock achievements
   - Level up (if enough XP)

### Long-term Growth
- **Week 1**: Beer tier, Level 2, 1.1x multiplier
- **Week 2**: Beer tier, Level 3, 7-day streak → 1.25x multiplier
- **Month 1**: Wine tier, Level 5, achievements → 2.5x multiplier
- **Month 3**: Donut tier, Level 10, 30-day streak → 5.0x+ multiplier
- **Year 1**: Diamond/Trophy tier, Level 25+, 10.0x+ multiplier

---

## 🔢 Example Progression

**Trader: Sarah**
- Goal: $5,000 → $250,000 (50 completions @ 8%)
- Token: Beer → Wine → Donut → Diamond

**Month 1:**
- Completions: 5
- Level: 4
- Streak: 25 days
- Multiplier: 2.8x
- Progress Object: Beer (approaching Wine)

**Month 3:**
- Completions: 15
- Level: 9
- Streak: 60 days (longest: 65)
- Multiplier: 5.2x
- Progress Object: Wine

**Month 6:**
- Completions: 30
- Level: 15
- Streak: 90 days
- Multiplier: 9.5x
- Progress Object: Donut
- Achievements: 8 unlocked

**Year 1:**
- Completions: 50
- Level: 25
- Streak: 120+ days
- Multiplier: 15.0x+
- Progress Object: Diamond
- Account: $5k → $250k (GOAL REACHED!)

---

## 📈 Dashboard Displays

### Visual Elements
1. **Current Progress Object**
   - Large animated emoji (floating)
   - Object name and tier level
   - Progress bar to next tier

2. **Stats Cards**
   - Total completions
   - Current streak (🔥 fire emoji)
   - Current level (⭐)
   - Total growth multiplier (⚡)

3. **Level Progress Bar**
   - XP progress to next level
   - Visual bar with glow effect

4. **Achievements Badge**
   - Unlocked achievements count
   - Recent achievements popup

---

## 🛠️ Database Tables

### `user_progress`
Stores all progress metrics for a user:
- completions, streak, longest_streak
- discipline_score, level, experience
- current_progress_object
- All multipliers (streak, level, achievement, total)

### `daily_check_ins`
Tracks every daily check-in:
- Date, discipline rating, rules followed
- Trade stats (count, win rate, P/L)
- Emotions, notes
- XP earned, streak at time

### `completions`
Records each milestone completion:
- Completion number and date
- Starting/ending balance, gain %
- Token type, notes, trades count

### `achievements`
Master list of all achievements

### `user_achievements`
Junction table tracking unlocked achievements per user

### `progress_objects`
Reference table for tier progression

---

## 🎯 Key Features

### 1. Compounding Effects
Every metric builds on the previous:
- Longer streaks = more XP per check-in
- More XP = faster leveling
- Higher level = bigger bonuses
- More achievements = multiplier stacking
- **Result**: Exponential growth motivation

### 2. Visual Progression
- See your progress object evolve
- Watch bars fill up
- Level up celebrations
- Achievement unlocks

### 3. Gamification
- RPG-style leveling
- Collectible achievements
- Daily engagement rewards
- Milestone celebrations

### 4. Discipline Tracking
- Objective metrics (check-ins, completions)
- Subjective ratings (discipline 1-10)
- Streak accountability
- Rule compliance

---

## 🚀 Next Steps

### To Activate the System:
1. **Run the SQL**: Execute `database_schema.sql` in Supabase
2. **Test Signup**: Create account → complete onboarding
3. **Test Check-in**: Use `performDailyCheckIn()` function
4. **Test Completion**: Use `completeToken()` function
5. **View Dashboard**: See real-time progress updates

### Future Enhancements:
- Leaderboards (compare with other traders)
- Weekly challenges
- Custom achievements
- Social sharing of milestones
- Referral bonuses
- Premium progress objects

---

## 🔥 Why This Works

### Psychology:
1. **Variable Rewards**: Never know when you'll level up or unlock achievement
2. **Loss Aversion**: Don't want to break the streak
3. **Progress Tracking**: Visual feedback is motivating
4. **Social Proof**: Compare multipliers with others
5. **Gamification**: Makes discipline fun

### Trading Benefits:
1. **Consistency**: Daily check-ins build habits
2. **Accountability**: Can't hide from the numbers
3. **Motivation**: See growth over time
4. **Discipline**: Rules enforced by AI + social pressure
5. **Compounding**: Mirrors trading account growth

---

**Your discipline compounds. Your account compounds. Your success compounds.**

🔒 **Lock It In.** 🚀
