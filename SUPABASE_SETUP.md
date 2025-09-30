# Supabase Integration Setup Guide

## 📋 Prerequisites
- A Supabase account (free tier works great!)
- Your LockIn app files

## 🚀 Quick Setup Steps

### 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create a free account
3. Click "New Project"
4. Fill in:
   - **Project Name**: `lockin` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait ~2 minutes for setup

### 2. Get Your Project Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (looks like: `https://xyzabc123.supabase.co`)
   - **Anon/Public Key** (long string starting with `eyJ...`)

### 3. Configure Your App
1. Open `auth.js` in your project
2. Replace the placeholder values:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Paste your Project URL here
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Paste your Anon Key here
   ```

### 4. Enable Email Authentication
1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (it should be by default)
3. Optionally configure:
   - **Confirm email**: Toggle ON/OFF (recommended: ON for production)
   - **Secure email change**: Toggle ON
   - **Secure password change**: Toggle ON

### 5. (Optional) Configure Email Templates
1. Go to **Authentication** → **Email Templates**
2. Customize the following templates:
   - Confirm signup
   - Reset password
   - Magic Link
   - Email change

### 6. (Optional) Set Site URL
1. Go to **Authentication** → **URL Configuration**
2. Add your site URLs:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add any additional URLs (e.g., your production domain)

## 📊 Database Schema (Optional)

You can create additional tables to store user data. Here's a starter schema:

### Users Table (already exists via auth.users)

### Trades Table (example)
```sql
create table trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  symbol text not null,
  direction text not null, -- 'long' or 'short'
  entry_price numeric not null,
  exit_price numeric,
  size numeric not null,
  profit_loss numeric,
  status text default 'open', -- 'open', 'closed'
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security)
alter table trades enable row level security;

-- Create policy: users can only see their own trades
create policy "Users can view own trades"
  on trades for select
  using (auth.uid() = user_id);

-- Create policy: users can insert their own trades
create policy "Users can insert own trades"
  on trades for insert
  with check (auth.uid() = user_id);

-- Create policy: users can update their own trades
create policy "Users can update own trades"
  on trades for update
  using (auth.uid() = user_id);
```

### Completions Table (for tracking progress tokens)
```sql
create table completions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  completion_date date not null,
  token_type text default 'beer', -- 'beer', 'wine', 'donut', 'diamond'
  account_value numeric not null,
  percentage_gain numeric not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table completions enable row level security;

create policy "Users can view own completions"
  on completions for select
  using (auth.uid() = user_id);

create policy "Users can insert own completions"
  on completions for insert
  with check (auth.uid() = user_id);
```

## ✅ Testing Your Setup

1. Open `signup.html` in your browser
2. Try creating a new account with your email
3. Check your email for verification (if enabled)
4. Try logging in at `login.html`
5. You should be redirected to `dashboard.html`

## 🔒 Security Best Practices

### For Development:
- ✅ Using the anon/public key is safe
- ✅ Supabase handles authentication securely
- ✅ Row Level Security (RLS) protects user data

### For Production:
- ✅ Always use HTTPS
- ✅ Enable email confirmation
- ✅ Set up proper redirect URLs
- ✅ Enable RLS on all tables
- ✅ Consider adding rate limiting
- ✅ Never expose your service_role key in client code

## 🎯 Features Included

- ✅ **Sign Up**: Create new user accounts
- ✅ **Log In**: Authenticate existing users
- ✅ **Log Out**: Secure sign out
- ✅ **Password Reset**: Email-based password recovery
- ✅ **Session Management**: Auto-redirect based on auth state
- ✅ **Protected Dashboard**: Only accessible when logged in

## 📱 Next Steps

1. Configure your Supabase credentials in `auth.js`
2. Test the signup/login flow
3. Customize the dashboard with real trading data
4. Add database tables for trades, completions, and goals
5. Build out the trading journal features
6. Deploy to production!

## 🆘 Troubleshooting

**Issue**: "Invalid API key" error
- **Solution**: Double-check you copied the correct anon key from Supabase dashboard

**Issue**: Email not sending
- **Solution**: Check Supabase email settings and verify email templates are enabled

**Issue**: User can't access dashboard
- **Solution**: Check browser console for auth errors and verify session is active

**Issue**: CORS errors
- **Solution**: Add your domain to allowed URLs in Supabase dashboard

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Ready to Lock In? 🔒** Your trading discipline journey starts now!
