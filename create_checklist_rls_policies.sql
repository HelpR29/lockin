-- Row Level Security (RLS) Policies for Premarket Checklist
-- Run this AFTER creating the tables
-- Ensures users can only access their own checklist data

-- Enable RLS on tables
ALTER TABLE public.premarket_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premarket_checklist_daily ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Users can manage own checklist items" ON public.premarket_checklist_items;
DROP POLICY IF EXISTS "Users can manage own daily progress" ON public.premarket_checklist_daily;

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

-- Verify policies were created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('premarket_checklist_items', 'premarket_checklist_daily');
