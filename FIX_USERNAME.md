# Fix Dashboard Username Issue

## Problem
Dashboard shows "Welcome, Trader!" instead of your actual username "nathanrn"

## Quick Fixes

### Option 1: Check Console Logs (RECOMMENDED)

1. **Open Browser Console** (F12 or Cmd+Option+I)
2. **Look for these logs:**
   ```
   🚀 Dashboard initializing...
   🔄 Loading user profile...
   👤 User ID: [your-id]
   📊 Profile data: {...}
   ```

3. **Tell me what you see** - this will show the exact issue

---

### Option 2: Update Username Directly in Database

**Run this in Supabase SQL Editor:**

```sql
-- Check current username
SELECT user_id, username FROM user_profiles WHERE user_id = auth.uid();

-- If username is NULL or wrong, update it:
UPDATE user_profiles 
SET username = 'nathanrn'
WHERE user_id = auth.uid();

-- Verify it worked:
SELECT user_id, username FROM user_profiles WHERE user_id = auth.uid();
```

---

### Option 3: Update via Browser Console

**Run this in browser console:**

```javascript
// Check current profile
supabase.from('user_profiles')
  .select('*')
  .single()
  .then(r => console.log('Current profile:', r.data));

// Update username
supabase.from('user_profiles')
  .update({ username: 'nathanrn' })
  .eq('user_id', (await supabase.auth.getUser()).data.user.id)
  .then(() => {
    console.log('✅ Username updated!');
    location.reload();
  });
```

---

### Option 4: Re-run Onboarding

If the username is truly missing, you can reset and redo onboarding:

```sql
-- In Supabase SQL Editor:
UPDATE user_profiles 
SET onboarding_completed = false,
    username = 'nathanrn'
WHERE user_id = auth.uid();
```

Then go to: http://localhost:8000/onboarding.html

---

## Most Likely Causes

1. **Username field is NULL in database**
   - Solution: Run Option 2 SQL update

2. **Wrong user_id is being used**
   - The profile exists but under different user_id
   - Solution: Check which user you're logged in as

3. **Profile doesn't exist**
   - Onboarding wasn't completed
   - Solution: Run Option 4

4. **JavaScript isn't running**
   - loadUserProfile() function not executing
   - Solution: Check console for errors

---

## What Should Happen

**After the fix:**
```
🚀 Dashboard initializing...
🔄 Loading user profile...
👤 User ID: abc-123-xyz
📊 Profile data: {username: "nathanrn", avatar: "..."}
✅ Updated username to: nathanrn
```

Dashboard will show: **"Welcome, nathanrn! 🎯"**

---

## Debug Command

Run this in console to see what's happening:

```javascript
(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user ID:', user.id);
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  console.log('Profile:', data);
  console.log('Error:', error);
  
  if (!data?.username) {
    console.log('❌ Username is missing! Run update:');
    console.log(`UPDATE user_profiles SET username = 'nathanrn' WHERE user_id = '${user.id}';`);
  }
})();
```

This will show you:
- Your current user ID
- Your profile data
- Whether username exists
- SQL command to fix it if needed
