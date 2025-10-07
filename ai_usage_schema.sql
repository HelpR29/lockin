-- AI usage tracking for weekly/monthly OpenAI analyses
-- Run in Supabase SQL Editor

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('weekly','monthly')),
  period_key text not null, -- e.g., ISO week '2025-41' or month '2025-10'
  used_count int not null default 0,
  last_used_at timestamptz not null default now(),
  primary key (user_id, period, period_key)
);

-- RLS: users can read their own usage; writes are performed by Edge Function with service role
alter table public.ai_usage enable row level security;

create policy ai_usage_select_self
on public.ai_usage for select
using (auth.uid() = user_id);

-- Helpful index if querying by user + period
create index if not exists idx_ai_usage_user_period on public.ai_usage(user_id, period);
