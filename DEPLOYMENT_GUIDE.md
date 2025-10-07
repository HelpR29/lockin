# 🚀 Deployment Guide

## Quick Deploy to Netlify

### Option 1: Git Deploy (Recommended)

1. **Commit Your Changes**
```bash
cd /Users/nathanrn29/Documents/GitHub/lockin
git add .
git commit -m "Add premarket checklist with onboarding and enforcement"
git push origin main
```

2. **Netlify Auto-Deploy**
   - If connected to GitHub, Netlify will auto-deploy
   - Check deploy logs in Netlify dashboard
   - Should see: "Static site - no build needed"

### Option 2: Manual Deploy via Netlify CLI

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Deploy
cd /Users/nathanrn29/Documents/GitHub/lockin
netlify deploy --prod
```

### Option 3: Drag & Drop Deploy

1. Zip your entire project folder
2. Go to Netlify dashboard
3. Drag folder to deploy area

---

## Database Setup (CRITICAL - Do First!)

### 1. Open Supabase Dashboard
- Go to https://app.supabase.com
- Select your project
- Click "SQL Editor" in sidebar

### 2. Run Schema Script
- Click "New Query"
- Open `create_premarket_checklist_tables.sql`
- Copy all contents
- Paste into SQL Editor
- Click "Run" or press Cmd+Enter

### 3. Verify Tables Created
- Go to "Table Editor"
- Should see:
  - ✅ `premarket_checklist_items`
  - ✅ `premarket_checklist_daily`

---

## Environment Check

### Required Environment Variables (should already be set)

In Netlify:
1. Go to Site Settings > Environment Variables
2. Verify these exist:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

In your code (already configured via `auth.js`):
```javascript
const supabase = supabase.createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_ANON_KEY'
);
```

---

## Post-Deploy Checklist

### Test Critical Paths

1. **Onboarding**
   - Visit `/onboarding.html`
   - Complete all 7 steps
   - Verify Step 7 checklist setup works
   - Check Supabase for saved items

2. **Dashboard**
   - Visit `/dashboard.html`
   - Find premarket checklist card
   - Mark items and refresh
   - Verify persistence

3. **Pre-Trade Modal**
   - Visit `/journal.html`
   - Uncheck checklist items
   - Try to log trade
   - Verify modal appears

4. **Analytics**
   - Visit `/reports.html`
   - Check "Premarket Checklist Adherence" section
   - Verify chart renders

---

## Files Changed (for review)

### New Files
- ✅ `checklist.js` - Core checklist logic
- ✅ `pretrade-checklist.js` - Modal enforcement
- ✅ `create_premarket_checklist_tables.sql` - Database schema
- ✅ `TESTING_CHECKLIST.md` - This guide
- ✅ `DEPLOYMENT_GUIDE.md` - You're reading it

### Modified Files
- ✅ `onboarding.html` - Added Step 7
- ✅ `onboarding.js` - Added checklist management
- ✅ `dashboard.html` - Added checklist card + scripts
- ✅ `journal.html` - Added checklist scripts
- ✅ `journal.js` - Added enforcement check
- ✅ `reports.html` - Added analytics section + scripts
- ✅ `psychology-report.js` - Added checklist analytics renderer
- ✅ `netlify.toml` - Updated publish directory

---

## Rollback Plan (if needed)

If something breaks:

1. **Revert Git Commit**
```bash
git revert HEAD
git push origin main
```

2. **Or Deploy Previous Version**
```bash
# In Netlify dashboard
# Deploys > Click previous deploy > Publish deploy
```

3. **Database Rollback** (if needed)
```sql
-- In Supabase SQL Editor
DROP TABLE IF EXISTS public.premarket_checklist_daily CASCADE;
DROP TABLE IF EXISTS public.premarket_checklist_items CASCADE;
```

---

## Performance Considerations

### Caching (already configured in netlify.toml)
- HTML: No cache (always fresh)
- CSS: 1 day cache
- JS: 1 day cache
- Images: 7 day cache

### Database Queries
- Checklist: 1 query per page load
- Daily state: 1 query per page load
- Analytics: 1 query for 30 days

**Total overhead**: ~3 extra DB queries per page

---

## Security Notes

### CSP Headers (already configured)
- Allows Supabase, CDNs, fonts
- Blocks inline scripts (except marked safe)
- Prevents XSS attacks

### Data Access
- All checklist data scoped to `user_id`
- RLS policies needed (see below)

### Recommended RLS Policies

Add in Supabase > Authentication > Policies:

```sql
-- Checklist Items: Users can only access their own
CREATE POLICY "Users can manage own checklist items"
ON public.premarket_checklist_items
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Daily Progress: Users can only access their own
CREATE POLICY "Users can manage own daily progress"
ON public.premarket_checklist_daily
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## Monitoring & Alerts

### What to Watch

1. **Error Rate**
   - Monitor browser console errors
   - Check Sentry/error tracking service

2. **Database Load**
   - Supabase Dashboard > Reports
   - Watch query performance

3. **User Behavior**
   - How many complete checklist daily?
   - How many skip the modal?
   - Average adherence rate?

### Recommended Metrics

```sql
-- Daily checklist completion rate
SELECT 
  date,
  COUNT(DISTINCT user_id) as active_users,
  AVG(CASE WHEN morning_checked AND eod_confirmed THEN 100 ELSE 0 END) as avg_adherence
FROM premarket_checklist_daily
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;
```

---

## Troubleshooting

### Issue: "Table does not exist" error
**Fix**: Run `create_premarket_checklist_tables.sql` in Supabase

### Issue: Modal doesn't appear
**Fix**: 
- Clear browser cache
- Check script load order in journal.html
- Verify `enforcePretradeChecklist` is defined

### Issue: Items don't save
**Fix**:
- Check Supabase connection
- Verify RLS policies allow access
- Check browser console for auth errors

### Issue: Analytics show no data
**Fix**:
- Ensure at least 1 day of data exists
- Check that items are marked both AM AND EOD
- Verify active items exist

---

## Success Metrics

After 1 week, check:
- ✅ Onboarding completion rate
- ✅ Daily checklist adherence rate
- ✅ Modal skip rate
- ✅ Trade volume (before vs after checklist)

Expected impact:
- 📈 Higher discipline scores
- 📉 Fewer rule violations
- 📈 Better trading outcomes
- 📊 More consistent routines

---

## Support

If you encounter issues:

1. Check `TESTING_CHECKLIST.md` for test scenarios
2. Review browser console errors
3. Check Supabase logs
4. Verify all files deployed correctly
5. Test in incognito mode (cache-free)

---

## Next Features to Consider

After this deploys successfully:

1. **Push Notifications**
   - Morning reminder at 9:00 AM
   - EOD confirmation at 4:00 PM

2. **Checklist Templates**
   - Day Trader template
   - Swing Trader template  
   - Options Trader template

3. **Streak Tracking**
   - Consecutive days completed
   - Longest streak badge

4. **Mobile App**
   - Dedicated mobile checklist
   - Quick AM check widget

5. **AI Suggestions**
   - Recommend items based on trading style
   - Auto-detect missing items

---

Ready to deploy? Follow the steps above and reference `TESTING_CHECKLIST.md` for verification!
