# 🔐 Login Troubleshooting Guide

## Issue: "Invalid login credentials" after signing up

### Root Cause
Your Supabase project likely has **email confirmation enabled** by default. This means users must verify their email before logging in.

### Solution Steps

#### For New Users:
1. **Sign up** with your email and password
2. **Check your email inbox** (including spam folder)
3. **Click the confirmation link** in the email from Supabase
4. **After clicking the link**, you'll be redirected to the reset password page
5. **Now try logging in** with your credentials

#### Alternative: Disable Email Confirmation (For Development)

If you want to skip email confirmation during development:

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Providers**
3. Click on **Email**
4. Toggle **OFF** the "Confirm email" option
5. Click **Save**

Now new signups won't require email confirmation!

---

## Password Reset Flow

### If you forgot your password:

1. Go to the **Login page**
2. Click **"Forgot Password?"**
3. Enter your email address
4. Check your email for the reset link
5. Click the link (you'll be taken to `reset-password.html`)
6. Enter your new password
7. Log in with the new password

---

## Common Issues & Fixes

### 1. "Invalid login credentials"
**Cause**: Email not verified yet
**Fix**: Check email and click confirmation link

### 2. Password reset link shows 404
**Cause**: Missing reset-password.html file
**Fix**: ✅ **FIXED** - The file has been created

### 3. Can't receive emails
**Check**:
- Spam/Junk folder
- Email address spelled correctly
- Supabase email settings are configured

### 4. Already verified but still can't log in
**Try**:
- Use the "Forgot Password" flow to reset your password
- Check if caps lock is on
- Make sure password is correct

---

## Email Confirmation Settings in Supabase

### To check your settings:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Settings**
4. Look for **"Enable email confirmations"**

### Recommended Settings:

**Development**: Email confirmations **OFF**
**Production**: Email confirmations **ON** (for security)

---

## Test Account Creation

To test properly:

1. **Clear browser cache** (Cmd+Shift+Delete on Mac)
2. Go to `/signup.html`
3. Create account with a **real email you can access**
4. Watch for the confirmation email
5. Click the link in the email
6. Try logging in

---

## Quick Fix Command

If you need to manually confirm a user in Supabase:

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Find your user
3. Click on the user
4. Toggle **"Email Confirmed"** to ON
5. Try logging in again

---

**Your app is now properly configured for both scenarios! 🎉**
