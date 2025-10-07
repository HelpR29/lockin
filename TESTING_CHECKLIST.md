# 🧪 Premarket Checklist Testing Guide

## Prerequisites

### 1. Database Setup (Recommended)
Run in your Supabase SQL Editor:
```bash
# Open Supabase Dashboard > SQL Editor > New Query
# Copy/paste contents of create_premarket_checklist_tables.sql
# Click "Run"
```

This creates:
- `premarket_checklist_items` table
- `premarket_checklist_daily` table

**Without database**: System falls back to localStorage (works but no cross-device sync)

---

## Test Plan

### ✅ Test 1: Onboarding Flow (New Users)

**Goal**: Verify Step 7 checklist setup works

1. **Create test user or reset onboarding**
   - Go to Supabase Dashboard > Authentication
   - Create new user OR delete existing user's profile to restart onboarding

2. **Complete Steps 1-6** as normal
   - Profile setup
   - Goals
   - Rules (old step 4)
   - Token selection
   - Rules selection

3. **Step 7: Premarket Checklist**
   - Should see "Setup Your Premarket Checklist" page
   - Try adding custom item: "Test my custom checklist item"
   - Edit the item by clicking ✏️
   - Delete it by clicking 🗑️
   - Click "📦 Load Default Checklist"
   - Should see 7 default items appear
   - Verify counter shows "7" at bottom

4. **Complete Onboarding**
   - Click "Complete Setup"
   - Watch console for: `✅ Checklist items saved successfully!`
   - Redirect to dashboard

**Expected Result**: ✅ Checklist items saved to database

---

### ✅ Test 2: Dashboard Checklist Card

**Goal**: Verify AM/EOD marking works

1. **Open dashboard.html**
   - Scroll to find "📋 Premarket Checklist" card
   - Should show today's date
   - See all 7 items with checkboxes

2. **Morning (AM) Mode** (default)
   - Check 3-4 items
   - Refresh page
   - **Verify**: Checked items remain checked ✅

3. **Bulk Actions**
   - Click "Mark All (Morning)"
   - **Verify**: All items checked
   - Click "Deselect All"
   - **Verify**: All unchecked

4. **EOD Mode**
   - Click "EOD Confirm" button
   - **Verify**: Shows EOD checkboxes instead of AM
   - Confirm 5 items
   - Refresh page
   - Toggle back to EOD mode
   - **Verify**: 5 items show as confirmed

5. **Add/Edit/Delete**
   - Add new item via input at top
   - Edit item with ✏️ button
   - Delete item with 🗑️ button
   - **Verify**: Changes persist after refresh

6. **Active Toggle**
   - Uncheck "Active" on one item
   - **Verify**: Item grays out and won't count in analytics

**Expected Result**: ✅ All state persists after refresh

---

### ✅ Test 3: Pre-Trade Modal Enforcement

**Goal**: Verify modal blocks trade entry until checklist complete

#### Scenario A: Incomplete Checklist
1. **Setup**
   - Go to dashboard
   - Uncheck some checklist items (leave 2-3 unchecked)

2. **Try to log trade**
   - Go to journal.html
   - Fill out trade form (symbol, price, etc.)
   - Click "Log Trade"

3. **Modal Should Appear**
   - **Verify**: Modal pops up with title "📋 Premarket Checklist"
   - **Verify**: "Continue to Trade" button is DISABLED (grayed out)
   - **Verify**: Unchecked items visible

4. **Complete Checklist**
   - Check all items in modal
   - **Verify**: "Continue to Trade" button becomes ENABLED (bright orange)
   - Click "Continue to Trade"
   - **Verify**: Modal closes and trade saves

**Expected Result**: ✅ Trade saved after checklist completion

#### Scenario B: Skip Option
1. **Setup**
   - Go to dashboard and uncheck items again

2. **Try to log trade**
   - Go to journal.html
   - Fill trade form
   - Click "Log Trade"

3. **Skip Flow**
   - Modal appears
   - Click "Skip (Not Recommended)"
   - **Verify**: Modal closes immediately
   - **Verify**: Trade saves anyway

**Expected Result**: ✅ Skip allows trade without completion

#### Scenario C: Already Complete
1. **Setup**
   - Go to dashboard
   - Check ALL items (AM mode)

2. **Try to log trade**
   - Go to journal.html
   - Fill trade form
   - Click "Log Trade"

3. **No Modal**
   - **Verify**: Modal does NOT appear
   - **Verify**: Trade saves immediately

**Expected Result**: ✅ No interruption when checklist done

#### Scenario D: Editing Existing Trade
1. **Edit trade** (not create new)
   - Open journal.html
   - Click edit on existing trade
   - Modify and save

2. **No Modal**
   - **Verify**: Modal does NOT appear for edits
   - **Verify**: Edit saves immediately

**Expected Result**: ✅ Modal only appears for NEW trades

---

### ✅ Test 4: Analytics in Reports

**Goal**: Verify adherence tracking works

1. **Generate Data**
   - Complete checklist on dashboard (all items AM checked + EOD confirmed)
   - Wait for tomorrow OR manually insert past dates in database

2. **View Reports**
   - Go to reports.html
   - Scroll to "Psychology & Discipline" section
   - Find "🗓️ Premarket Checklist Adherence" card

3. **Verify Metrics**
   - **30d Avg Adherence**: Should show percentage
   - **High-Adherence Streak**: Days with ≥80% completion
   - **Line Chart**: Should show daily adherence trend

4. **Test Inactive Items**
   - Go to dashboard
   - Toggle one item to inactive
   - Return to reports and refresh
   - **Verify**: Adherence % recalculates without inactive item

**Expected Result**: ✅ Analytics update based on daily completion

---

### ✅ Test 5: Database Persistence

**Goal**: Verify Supabase storage works

1. **Check Items Table**
   - Supabase Dashboard > Table Editor
   - Open `premarket_checklist_items`
   - **Verify**: Your checklist items appear
   - **Verify**: Columns: id, user_id, text, sort, is_active

2. **Check Daily Table**
   - Open `premarket_checklist_daily`
   - **Verify**: Today's entries appear after marking items
   - **Verify**: Columns: user_id, date, item_id, morning_checked, eod_confirmed

3. **Cross-Device Test** (if possible)
   - Complete checklist on one device
   - Open dashboard on different device/browser
   - **Verify**: Checklist state syncs

**Expected Result**: ✅ Data persists in Supabase

---

## Common Issues & Fixes

### Issue: Modal doesn't appear
**Fix**: 
- Check browser console for errors
- Verify `pretrade-checklist.js` is loaded
- Verify `checklist.js` is loaded before it

### Issue: Items don't persist after refresh
**Fix**: 
- Check if Supabase tables exist
- Check browser console for database errors
- Verify localStorage has data (fallback mode)

### Issue: Step 7 doesn't show in onboarding
**Fix**:
- Check `totalSteps = 7` in onboarding.js
- Clear browser cache and retry
- Check console for JavaScript errors

### Issue: Analytics show 0%
**Fix**:
- Ensure items are marked BOTH AM checked AND EOD confirmed
- Check that items are set to "Active"
- Verify daily records exist in database

---

## Browser Console Debugging

Open DevTools (F12) and watch for these logs:

### Onboarding Completion:
```
✅ Trading rules saved successfully!
💾 Saving X checklist items...
✅ Checklist items saved successfully!
✅ Onboarding complete!
```

### Pre-Trade Modal:
```
📋 Enforcing premarket checklist...
✅ Checklist complete, proceeding with trade
```

### Dashboard Card:
```
🔄 Loading checklist items...
✅ Loaded X items
```

---

## Manual Database Queries (Advanced)

### Check your checklist items:
```sql
SELECT * FROM premarket_checklist_items 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY sort;
```

### Check today's progress:
```sql
SELECT * FROM premarket_checklist_daily 
WHERE user_id = 'YOUR_USER_ID' 
  AND date = CURRENT_DATE;
```

### Get 30-day adherence:
```sql
SELECT 
  date,
  COUNT(*) as total_items,
  SUM(CASE WHEN morning_checked AND eod_confirmed THEN 1 ELSE 0 END) as completed
FROM premarket_checklist_daily
WHERE user_id = 'YOUR_USER_ID'
  AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;
```

---

## Deployment Checklist

Before deploying to production:

- ✅ Run SQL script in production Supabase
- ✅ Test onboarding flow with real user
- ✅ Verify modal appears before trades
- ✅ Test on mobile devices
- ✅ Check analytics with multi-day data
- ✅ Clear browser cache after deploy
- ✅ Update CSP headers if needed (already done in netlify.toml)

---

## Success Criteria

✅ **Onboarding**: Step 7 saves checklist items  
✅ **Dashboard**: Card shows items with AM/EOD toggles  
✅ **Modal**: Blocks new trades until checklist done  
✅ **Analytics**: Shows 30d adherence trends  
✅ **Persistence**: State survives page refresh  
✅ **Cross-Device**: Works on multiple devices  

---

## Next Steps After Testing

1. **Gather feedback** on default checklist items
2. **Add notifications** for morning checklist reminders
3. **Implement drag-and-drop** reordering of items
4. **Add templates** for different trading styles
5. **Create mobile app** version with push notifications

---

Need help? Check browser console for errors or review `create_premarket_checklist_tables.sql` to ensure database is setup correctly.
