# Authentication Fix for Dropbox Multi-User Issue

## Problem Summary

When a coworker signed into the app, they were automatically logged into another user's Dropbox instead of being asked to authenticate with their own Dropbox account.

## Root Cause

The backend authentication was completely disabled, causing **all users to share the same user ID: "anonymous"**. This meant:

1. User A connects Dropbox → token stored for `user_id="anonymous"`
2. User B logs in → also gets `user_id="anonymous"`
3. User B sees User A's Dropbox because they share the same `user_id` in the database

### Code Location
- **File:** `backend/main.py:81-86`
- **Issue:** `get_supabase_auth_config()` was returning `None`, disabling all authentication
- **Fallback:** When auth is disabled, `backend/databutton_app/mw/auth_mw.py:56-57` returns a hardcoded "anonymous" user for everyone

## Solution Implemented

I've implemented proper Supabase JWT authentication validation:

### Changes Made

1. **Updated `backend/app/config.py`**
   - Added `SUPABASE_URL` configuration
   - Added `SUPABASE_JWT_SECRET` configuration (for reference, though JWKS is used)

2. **Updated `backend/main.py`**
   - Implemented proper `get_supabase_auth_config()` function
   - Now uses Supabase JWKS (JSON Web Key Set) for JWT validation
   - JWKS endpoint: `{SUPABASE_URL}/auth/v1/jwks`
   - Audience: `"authenticated"` (default Supabase role)

3. **Updated `backend/.env.example`**
   - Added `SUPABASE_JWT_SECRET` to environment variables template

## How to Fix Your Deployment

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **JWT Secret** (found under "Project API keys" → "JWT Secret")

### Step 2: Update Your Backend Environment Variables

Add the following environment variables to your backend deployment:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase
```

#### For Local Development:
1. Edit `backend/.env` file
2. Add the variables above
3. Restart your backend server

#### For Vercel/Railway/Other Cloud Platforms:
1. Go to your deployment platform's dashboard
2. Navigate to Environment Variables settings
3. Add both `SUPABASE_URL` and `SUPABASE_JWT_SECRET`
4. Redeploy your backend

### Step 3: Verify the Fix

1. Restart your backend server
2. Check the logs on startup - you should see:
   ```
   Supabase auth configured with JWKS URL: https://xxxxx.supabase.co/auth/v1/jwks
   ```

   Instead of:
   ```
   Warning: No Supabase auth config found - authentication will be disabled
   ```

3. Test with multiple users:
   - User A logs in and connects Dropbox
   - User B logs in with a different account
   - User B should NOT see User A's Dropbox connection
   - User B should be prompted to connect their own Dropbox

## Technical Details

### How Authentication Now Works

1. **Frontend** (`frontend/src/app/auth/auth.ts`):
   - User signs in with Google via Supabase
   - Supabase returns a JWT access token
   - Frontend includes token in `Authorization: Bearer <token>` header

2. **Backend** (`backend/databutton_app/mw/auth_mw.py`):
   - Receives request with Authorization header
   - Validates JWT token using Supabase JWKS endpoint
   - Extracts user ID (`sub` claim) from validated token
   - Each user gets their unique ID (e.g., UUID from Supabase)

3. **Dropbox Integration** (`backend/app/apis/dropbox_integration/__init__.py`):
   - Stores Dropbox tokens per `user_id` in database
   - Each user's tokens are isolated by their unique user ID

### Database Schema

The `dropbox_tokens` table is already correctly designed:

```sql
CREATE TABLE IF NOT EXISTS dropbox_tokens (
    user_id TEXT PRIMARY KEY,  -- Unique per user
    refresh_token TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

The issue was that all users were getting the same `user_id="anonymous"` due to disabled authentication.

## Security Notes

### What Was Wrong
- ❌ No authentication validation
- ❌ All users shared "anonymous" user ID
- ❌ Anyone could access anyone else's Dropbox files
- ❌ Major privacy and security violation

### What's Fixed Now
- ✅ Proper JWT validation using Supabase JWKS
- ✅ Each user gets unique, verified user ID
- ✅ Dropbox tokens isolated per user
- ✅ No cross-user data access

## Testing Checklist

After deploying the fix, verify:

- [ ] Backend logs show "Supabase auth configured" on startup
- [ ] User A can log in and connect Dropbox
- [ ] User B can log in with different account
- [ ] User B does NOT see User A's Dropbox connection
- [ ] User B can connect their own Dropbox independently
- [ ] Both users can upload/view their own receipts separately
- [ ] No "anonymous" user appears in logs during authenticated requests

## Troubleshooting

### Still seeing "anonymous" user in logs?
- Check that `SUPABASE_URL` environment variable is set correctly
- Verify the URL doesn't have trailing slash
- Confirm environment variables are loaded (restart may be needed)

### JWT validation failing?
- Ensure frontend is sending valid Supabase tokens
- Check that Supabase project is active and accessible
- Verify JWKS endpoint is reachable: `curl https://your-project.supabase.co/auth/v1/jwks`

### Users still seeing each other's data?
- Clear browser cache and local storage
- Ensure database doesn't have legacy "anonymous" tokens
- Run: `DELETE FROM dropbox_tokens WHERE user_id = 'anonymous';`

## Additional Recommendations

1. **Audit Database**: Check for any legacy "anonymous" tokens:
   ```sql
   SELECT * FROM dropbox_tokens WHERE user_id = 'anonymous';
   ```

2. **Monitor Logs**: Watch for authentication errors after deployment

3. **User Communication**: Inform users they may need to:
   - Sign out and sign back in
   - Reconnect their Dropbox accounts

4. **Test in Staging**: If you have a staging environment, test there first

## Questions?

If you encounter any issues with this fix, check:
1. Environment variables are correctly set
2. Backend service has been restarted
3. Supabase project is active and accessible
4. Frontend is sending authentication tokens correctly
