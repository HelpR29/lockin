# Custom Rule Not Appearing - Debug Guide

## Issue
Custom rules added don't appear in the rules list after saving.

## Possible Causes

### 1. Premium Lock Blocking the Modal
**Symptom:** Clicking "+ Add Custom Rule" shows premium modal instead of add modal
**Cause:** `isPremiumUser` is `false` (default for free users)
**Solution:** Temporarily make yourself premium OR disable premium check

### 2. Modal Elements Not Found
**Symptom:** Error in console: "Could not find form elements"
**Cause:** Modal creates elements dynamically, selectors might be wrong
**Solution:** Check console for errors, verify modal HTML

### 3. Database Permission Issue
**Symptom:** Error: "permission denied" or "RLS policy"
**Cause:** Supabase Row Level Security blocking insert
**Solution:** Check RLS policies on `trading_rules` table

### 4. Page Refresh Too Fast
**Symptom:** Rule saves but doesn't show after reload
**Cause:** Database write not complete before page refresh
**Solution:** Added 500ms delay before reload

---

## Debug Steps

### Step 1: Check Premium Status

Open browser console on rules.html and run:
```javascript
debugModal()
```

**Look for:**
```
Premium status: false
```

If `false`, the premium modal will block you. Two options:

**Option A: Make Yourself Premium**
```sql
-- In Supabase SQL Editor
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

UPDATE user_profiles 
SET is_premium = true
WHERE user_id = 'YOUR_USER_ID';
```

**Option B: Test Direct Database Insert**
```javascript
testAddRule()
```
This bypasses the modal completely and tests database access.

### Step 2: Test Database Access

In console, run:
```javascript
testAddRule()
```

**Expected Output:**
```
🧪 Testing direct rule addition...
User: abc-123-xyz
✅ Rule added: [{...}]
Reloading page in 2 seconds...
```

**If Error:**
- Check error message
- Verify you're logged in
- Check Supabase RLS policies

### Step 3: Check if Rules Are Actually Saved

**Option A: Check in Supabase Dashboard**
1. Go to Table Editor
2. Open `trading_rules` table
3. Filter by your user_id
4. See if your custom rules are there

**Option B: Query in Console**
```javascript
supabase
  .from('trading_rules')
  .select('*')
  .then(result => console.log('All rules:', result.data));
```

### Step 4: Check loadRules Function

In console, run:
```javascript
loadRules()
```

Watch console for:
```
🔄 Loading rules...
👤 User ID: abc-123
✅ Loaded X rules
📊 Rules data: [...]
```

If rules load but don't display, it's a rendering issue.

---

## Common Issues & Fixes

### Issue 1: Premium Modal Blocks Everything
**Problem:** Can't access add modal because premium modal shows
**Fix:** 
```sql
UPDATE user_profiles SET is_premium = true WHERE user_id = 'YOUR_USER_ID';
```

### Issue 2: "permission denied for table trading_rules"
**Problem:** RLS policy doesn't allow INSERT
**Fix:** Check policies in Supabase:
```sql
-- Allow users to insert their own rules
CREATE POLICY "Users can insert own rules"
ON trading_rules FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### Issue 3: Modal Opens But Submit Does Nothing
**Problem:** Form elements not found
**Fix:** Check console for "Could not find form elements" error
**Solution:** Modal is being removed before submit - check the `openAddRuleModal()` function

### Issue 4: Rule Saves But Doesn't Appear
**Problem:** Database write succeeds but page refresh doesn't show it
**Possible Causes:**
1. Wrong user_id saved
2. Rule saved but `loadRules()` filters it out
3. Category name mismatch

**Debug:**
```javascript
// Check what user_id you're using
supabase.auth.getUser().then(d => console.log('My user ID:', d.data.user.id));

// Check rules in database
supabase
  .from('trading_rules')
  .select('*')
  .eq('user_id', 'YOUR_USER_ID')
  .then(r => console.log('My rules:', r.data));
```

---

## Quick Fixes

### Fix 1: Bypass Premium Check (Temporary)

Edit `/rules.html` line ~370:
```javascript
// OLD:
if (typeof isPremiumUser !== 'undefined' && !isPremiumUser) {
    showPremiumModal();
} else {
    openAddRuleModal();
}

// NEW (temporary):
openAddRuleModal(); // Always open modal
```

### Fix 2: Add Rules Via Console

```javascript
async function quickAddRule(ruleText, category = 'General') {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from('trading_rules')
        .insert({
            user_id: user.id,
            rule: ruleText,
            category: category,
            is_active: true,
            times_followed: 0,
            times_violated: 0
        })
        .select();
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Added:', data);
        setTimeout(() => window.location.reload(), 1000);
    }
}

// Usage:
quickAddRule('My custom rule here', 'Risk Management');
```

### Fix 3: Force Reload Rules

```javascript
// Reload without page refresh
loadRules();
```

---

## Verification Checklist

After trying to add a custom rule:

- [ ] Check browser console for errors
- [ ] Run `debugModal()` to see status
- [ ] Run `testAddRule()` to test database
- [ ] Check Supabase table editor
- [ ] Verify `is_premium` column exists
- [ ] Check if premium modal is blocking
- [ ] Verify RLS policies allow INSERT
- [ ] Check if rules load with `loadRules()`

---

## Expected Flow (Working)

1. Click "+ Add Custom Rule" button
2. If free user → Premium modal shows 🔒
3. If premium user → Add Rule modal shows
4. Fill in category and rule text
5. Click "Add Rule" button
6. Console shows: "✅ Rule added successfully"
7. Alert: "Custom rule added successfully! Reloading..."
8. Page reloads after 500ms
9. New rule appears in appropriate category

---

## Quick Test Commands

Run these in browser console:

```javascript
// 1. Check status
debugModal();

// 2. Test database access
testAddRule();

// 3. Check your user ID
supabase.auth.getUser().then(d => console.log('User ID:', d.data.user.id));

// 4. Count your rules
supabase.from('trading_rules').select('*', { count: 'exact' }).then(r => console.log('Total rules:', r.count));

// 5. Force reload rules
loadRules();

// 6. Check premium status
supabase.from('user_profiles').select('is_premium').single().then(r => console.log('Premium:', r.data));
```

---

## Still Not Working?

If custom rules still don't appear after all checks:

1. **Clear browser cache** and reload
2. **Check Supabase logs** in dashboard
3. **Verify table schema** matches expectations
4. **Test with SQL directly** in Supabase:
   ```sql
   INSERT INTO trading_rules (user_id, rule, category, is_active, times_followed, times_violated)
   VALUES ('YOUR_USER_ID', 'Test rule', 'General', true, 0, 0);
   ```

5. **Check browser network tab** - see if INSERT request succeeds

---

**Most Common Issue:** Premium lock blocks the modal. Solution: Make yourself premium for testing!
