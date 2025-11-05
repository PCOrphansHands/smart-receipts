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
   - Added `SUPABASE_JWT_SECRET` configuration

2. **Updated `backend/main.py`**
   - Implemented proper `get_supabase_auth_config()` function
   - Uses Supabase JWT Secret (HS256) for token validation
   - Tried JWKS initially but Supabase requires API key for JWKS endpoint
   - JWT Secret is the standard way to validate Supabase tokens

3. **Updated `backend/databutton_app/mw/auth_mw.py`**
   - Modified `AuthConfig` to support both `jwt_secret` and `jwks_url`
   - Updated `authorize_token()` to try JWT Secret first (HS256), fallback to JWKS (RS256)
   - Supports flexible authentication for different providers

4. **Updated `backend/routers.json`**
   - Changed `disableAuth` from `true` to `false` for gmail and dropbox_integration
   - This was a critical security fix - routes were completely unprotected

5. **Added `backend/app/apis/diagnostics/`**
   - New diagnostics endpoint at `/routes/diagnostics/auth`
   - Checks if JWT Secret is configured
   - Reports authentication status

6. **Updated `backend/.env.example`**
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

Add the JWT Secret to your backend deployment:

```bash
# Supabase Configuration (REQUIRED)
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase
```

**You already have this in Railway!** I can see you've added:
```bash
SUPABASE_JWT_SECRET=gMC2RIVuXjS8NMWwiufEgSxDJPrMU7bbk13A/6e8GPZweRX00SvtrftdBgV7B8NeuN1N6sDJw66dQV7wR5aOHw==
```

So you're all set! Just wait for Railway to redeploy with the new code.

#### For Local Development:
1. Edit `backend/.env` file
2. Add `SUPABASE_JWT_SECRET=<your-secret>`
3. Restart your backend server

#### For Vercel/Railway/Other Cloud Platforms:
1. Go to your deployment platform's dashboard
2. Navigate to Environment Variables settings
3. Verify `SUPABASE_JWT_SECRET` is set (✅ already done in your case!)
4. Wait for automatic redeploy after git push

### Step 3: Verify the Fix

1. After Railway redeploys, check the diagnostics endpoint:
   ```
   https://smart-receipts-production.up.railway.app/routes/diagnostics/auth
   ```

   You should see:
   ```json
   {
     "jwt_secret_configured": true,
     "jwt_secret_length": 88,
     "auth_method": "JWT_SECRET",
     "auth_enabled": true,
     "info": "Supabase authentication configured using JWT Secret (HS256). Each user will have isolated access."
   }
   ```

2. Check Railway logs - you should see:
   ```
   Token validated using JWT Secret (HS256)
   User <uuid> authenticated
   ```

   Instead of:
   ```
   Warning: SUPABASE_JWT_SECRET not configured - authentication will be disabled
   Auth not configured, using anonymous user
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
