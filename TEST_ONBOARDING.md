# Onboarding Flow Test Plan

## Quick Test URL
```
http://localhost:8000/onboarding.html
```

## Pre-Test Setup
1. Make sure you're logged in (have a valid Supabase session)
2. Open browser developer console (F12) to monitor for errors
3. Have valid test data ready

## Step-by-Step Test

### Step 1: Welcome Screen ✓
- [ ] Page loads without errors
- [ ] Welcome message displays
- [ ] Feature list is visible
- [ ] "Let's Get Started" button is clickable
- **Action:** Click "Let's Get Started"
- **Expected:** Advances to Step 2

---

### Step 2: Profile Setup ✓
- [ ] Profile avatars display in grid (9 options)
- [ ] Username field is present
- [ ] Gender dropdown is present
- [ ] Experience dropdown is present
- [ ] Trading Style dropdown is present
- [ ] Markets dropdown is present

**Test Cases:**

#### Test 2.1: Form Validation
- **Action:** Click "Let's Get Started" without filling form
- **Expected:** Browser shows validation errors for required fields

#### Test 2.2: Avatar Selection
- **Action:** Click on an avatar (e.g., 👨‍💼)
- **Expected:** Avatar gets orange border and highlighted background

#### Test 2.3: Complete Form Submission
- **Actions:**
  1. Select an avatar
  2. Enter username: "test_trader"
  3. Select gender: "Male"
  4. Select experience: "Intermediate"
  5. Select trading style: "Day Trader"
  6. Select market: "Stocks"
  7. Click "Let's Get Started"
- **Expected:** Form saves and advances to Step 3

---

### Step 3: Goal Setting ✓
- [ ] Starting Capital field is present (default: 100)
- [ ] Total Bottles field is present (default: 50)
- [ ] Target % Per Completion field is present (default: 1)
- [ ] Max Loss % field is present (default: 2)
- [ ] Projection preview area exists

**Test Cases:**

#### Test 3.1: Projection Calculation
- **Actions:**
  1. Enter Starting Capital: 100
  2. Enter Total Bottles: 50
  3. Enter Target % Per Completion: 1
- **Expected:** 
  - Goal preview section appears
  - Projected value displays: ~$164.46 (100 * 1.01^50)

#### Test 3.2: Form Submission
- **Action:** Click "Continue" button
- **Expected:** Advances to Step 4

#### Test 3.3: Back Button
- **Action:** Click "Back" button
- **Expected:** Returns to Step 2 (data should be preserved)

---

### Step 4: Trading Rules ✓
- [ ] Max Risk Per Trade field is present
- [ ] Max Daily Loss field is present
- [ ] Max Trades Per Day field is present
- [ ] Required Win Rate field is present
- [ ] Require Journal checkbox is present

**Test Cases:**

#### Test 4.1: Complete Form
- **Actions:**
  1. Enter Max Risk Per Trade: 2
  2. Enter Max Daily Loss: 5
  3. Enter Max Trades Per Day: 3
  4. Enter Required Win Rate: 50
  5. Check "Require trade journal" box
  6. Click "Continue"
- **Expected:** Advances to Step 5

---

### Step 5: Token Selection ✓
- [ ] Token grid displays 4 options: Beer, Wine, Donut, Diamond
- [ ] Each token shows icon, name, and description
- [ ] "Complete Setup" button is disabled initially

**Test Cases:**

#### Test 5.1: Token Selection
- **Action:** Click on "Beer" token
- **Expected:** 
  - Token card gets orange border and highlighted background
  - "Complete Setup" button becomes enabled

#### Test 5.2: Token Change
- **Action:** Click on "Diamond" token after selecting "Beer"
- **Expected:** 
  - Beer token deselects
  - Diamond token highlights
  - Button remains enabled

#### Test 5.3: Complete Onboarding
- **Action:** Click "Complete Setup" button
- **Expected:** 
  1. Button text changes to "Saving..."
  2. Button becomes disabled
  3. Console shows: "Saving onboarding data: {profile, goals, rules, token}"
  4. Console shows: "✅ Onboarding complete! Redirecting to dashboard..."
  5. Button text changes to "✅ Complete!"
  6. Success overlay appears with:
     - 🎉 emoji
     - "Setup Complete!" heading
     - Welcome message
     - Progress bar countdown (4 seconds)
  7. After 4 seconds, redirects to dashboard.html

---

## Console Monitoring

### Expected Console Output (Success Path):
```
Saving onboarding data: {profile: {...}, goals: {...}, rules: {...}, token: "beer"}
✅ Cleaned up any existing incomplete records
✅ Trading rules saved successfully
✅ Default trading rules initialized
✅ Onboarding complete! Redirecting to dashboard...
```

### Check for Errors:
- [ ] No red error messages in console
- [ ] No "Uncaught" exceptions
- [ ] No "undefined is not a function" errors
- [ ] No network errors (check Network tab)

---

## Database Verification

After completing onboarding, verify in Supabase:

### Check user_profiles table:
```sql
SELECT * FROM user_profiles WHERE user_id = '<your-user-id>';
```
**Expected:**
- username = "test_trader"
- avatar = selected emoji
- gender = "male"
- experience = "intermediate"
- trading_style = "day_trader"
- markets = "stocks"
- progress_token = "beer"
- onboarding_completed = true

### Check user_goals table:
```sql
SELECT * FROM user_goals WHERE user_id = '<your-user-id>';
```
**Expected:**
- starting_capital = 100
- current_capital = 100
- total_bottles = 50
- bottles_remaining = 50
- target_percent_per_beer = 1
- max_loss_percent = 2

### Check user_progress table:
```sql
SELECT * FROM user_progress WHERE user_id = '<your-user-id>';
```
**Expected:**
- beers_cracked = 0
- beers_spilled = 0
- level = 1
- experience = 0
- progress_token = "beer"

### Check trading_rules table:
```sql
SELECT * FROM trading_rules WHERE user_id = '<your-user-id>' LIMIT 5;
```
**Expected:**
- ~20 default trading rules created
- Categories: Risk Management, Entry Rules, Exit Rules, Psychology, General

---

## Error Scenarios to Test

### Error 1: Missing Profile Data
- **Setup:** Skip to Step 5 without completing Step 2
- **Expected:** Validation error: "Please complete all steps before finishing setup"

### Error 2: No Token Selected
- **Setup:** Click "Complete Setup" without selecting a token
- **Expected:** Alert: "Please select a progress token"

### Error 3: Network Error
- **Setup:** Disable internet/Supabase connection
- **Expected:** Alert with error message about saving settings

---

## Success Criteria

All of the following must be true:
- ✅ All 5 steps can be navigated through
- ✅ Form validation works on all steps
- ✅ Back button returns to previous step
- ✅ Data persists when navigating back/forward
- ✅ Complete button successfully saves to database
- ✅ Success overlay displays
- ✅ Redirects to dashboard after completion
- ✅ No JavaScript errors in console
- ✅ All database tables have correct data

---

## Quick Debug Commands

### Check if JavaScript loaded:
```javascript
// In browser console:
typeof completeOnboarding // should be "function"
typeof saveProfile // should be "function"
typeof selectToken // should be "function"
```

### Check onboarding data:
```javascript
// In browser console:
onboardingData // should show {profile: {}, goals: {}, rules: {}, token: null}
```

### Force complete (for debugging):
```javascript
// In browser console:
onboardingData.profile = {username: "test", avatar: "👨‍💼", gender: "male", experience: "intermediate", trading_style: "day_trader", markets: "stocks"};
onboardingData.goals = {starting_capital: 100, total_bottles: 50, target_percent_per_beer: 1, max_loss_percent: 2};
onboardingData.rules = {max_risk_per_trade: 2, max_daily_loss: 5, max_trades_per_day: 3, min_win_rate: 50, require_journal: true};
selectedToken = "beer";
onboardingData.token = "beer";
completeOnboarding();
```

---

## Report Issues

If any test fails, note:
1. Which step/test case failed
2. What was the expected behavior
3. What actually happened
4. Any console errors
5. Screenshot if applicable
