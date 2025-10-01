# Quick Fix for Custom Rules Issue

## The Problem
The `is_premium` column doesn't exist yet, causing issues with the premium check.

## Quick Solution - Run This SQL in Supabase

1. **Go to Supabase Dashboard**
   - Open your project
   - Click "SQL Editor"
   - Click "New Query"

2. **Copy and Paste This:**
```sql
-- Add the premium column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

-- Make yourself premium for testing
UPDATE user_profiles 
SET is_premium = true
WHERE user_id = auth.uid();

-- Verify it worked
SELECT user_id, username, is_premium FROM user_profiles WHERE user_id = auth.uid();
```

3. **Click "Run"**

4. **Refresh Your Rules Page**

Now you should be able to add rules!

---

## Alternative: Use Test Button

I just added a **"🧪 Test Add Rule"** button on the rules page. 

This button:
- Bypasses the modal completely
- Adds a test rule directly to database
- Reloads the page automatically
- Shows the new rule!

**Click it to test if database access works!**

---

## If Test Button Works But Modal Doesn't

The issue is the premium lock. Run the SQL above to make yourself premium, then the modal will work.

---

## Check Console After SQL

After running the SQL, refresh the page and check console. You should see:
```
💎 Premium status: PREMIUM
```

Instead of:
```
💎 Premium status: FREE
```

Then all buttons will work without showing the premium modal!
