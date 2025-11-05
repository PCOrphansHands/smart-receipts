# Backend Setup Guide - Fixing Gmail & Dropbox OAuth

**Status**: ✅ Backend is running, but needs API credentials for OAuth features

---

## ✅ What's Working Now

- ✅ Backend server running on `http://localhost:8000`
- ✅ Frontend can communicate with backend
- ✅ Basic API endpoints available

## ⚠️ What Still Needs Configuration

Gmail and Dropbox OAuth will show errors until you configure real API credentials. Here's what you need:

1. **OpenAI API Key** - For receipt data extraction (AI-powered)
2. **Google OAuth Credentials** - For Gmail integration
3. **Dropbox OAuth Credentials** - For file storage

---

## 🔧 Step-by-Step Setup

### 1. OpenAI API Key (Required for Receipt Processing)

**What it does**: Uses GPT-4 Vision to extract vendor, date, amount from receipt images

**How to get it**:
1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Edit `backend/.env` and replace:
   ```env
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

**Cost**: Pay-as-you-go, ~$0.01-0.05 per receipt

---

### 2. Google OAuth (Required for Gmail Features)

**What it does**: Allows users to connect their Gmail and scan for receipt emails

**How to get it**:

#### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Name it "Smart Receipts" → Create

#### Step 2: Enable Gmail API
1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click "Enable"

#### Step 3: Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External
   - App name: "Smart Receipts"
   - Support email: your email
   - Developer contact: your email
   - Save
4. Return to "Create OAuth client ID":
   - Application type: **Web application**
   - Name: "Smart Receipts"
   - Authorized redirect URIs:
     - `http://localhost:8000/gmail/callback`
     - (Add production URL later: `https://your-backend-url.com/gmail/callback`)
   - Click "Create"

#### Step 4: Download Credentials
1. Click the download icon (⬇️) next to your new OAuth client
2. This downloads a JSON file
3. Open the JSON file - it looks like:
   ```json
   {
     "web": {
       "client_id": "123456789-abcdef.apps.googleusercontent.com",
       "project_id": "smart-receipts",
       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
       "token_uri": "https://oauth2.googleapis.com/token",
       "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
       "client_secret": "GOCSPX-...",
       "redirect_uris": ["http://localhost:8000/gmail/callback"]
     }
   }
   ```

#### Step 5: Update Backend .env
1. Edit `backend/.env`
2. Replace with your actual values:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
   GMAIL_OAUTH_CREDENTIALS={"web":{"client_id":"...","project_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_secret":"...","redirect_uris":["http://localhost:8000/gmail/callback"]}}
   ```

   **Note**: For `GMAIL_OAUTH_CREDENTIALS`, paste the entire JSON on one line

#### Step 6: Add Test Users (Development Only)
If your app is not published:
1. Go to "OAuth consent screen"
2. Scroll to "Test users"
3. Add your Gmail address as a test user

---

### 3. Dropbox OAuth (Required for Dropbox Upload)

**What it does**: Allows users to upload receipts to their Dropbox

**How to get it**:

#### Step 1: Create Dropbox App
1. Go to https://www.dropbox.com/developers/apps
2. Click "Create app"
3. Choose:
   - API: Scoped access
   - Access type: Full Dropbox
   - Name: "Smart Receipts" (must be unique)
4. Click "Create app"

#### Step 2: Get Credentials
1. In your new app's settings page:
   - **App key**: Copy this
   - **App secret**: Click "Show" and copy

#### Step 3: Set Redirect URI
1. Scroll to "OAuth 2" section
2. Under "Redirect URIs", add:
   - `http://localhost:8000/dropbox/callback`
3. Click "Add"

#### Step 4: Update Backend .env
1. Edit `backend/.env`
2. Replace:
   ```env
   DROPBOX_APP_KEY=your-app-key-here
   DROPBOX_APP_SECRET=your-app-secret-here
   ```

---

### 4. (Optional) Supabase Database

**What it does**: Stores user data and upload status

**For development**: The app can work without it (stores in memory)

**For production**: You'll want a real database

**How to set up**:
1. Go to https://supabase.com
2. Create a new project
3. Get credentials from Settings → API:
   - Project URL → `SUPABASE_URL`
   - anon/public key → (Frontend already has this)
4. Get database URL from Settings → Database:
   - Connection string → `DATABASE_URL`

---

## 🚀 After Configuration

### Restart Backend
After updating `.env`:
```bash
# Stop the current backend (Ctrl+C in the terminal)
# Then restart:
make run-backend
```

Or if using the terminal directly:
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```

### Test OAuth Flows

#### Test Gmail Connection:
1. Open frontend: http://localhost:5173
2. Sign in
3. Click "Connect Gmail"
4. Should open Google OAuth popup
5. Grant permissions
6. Should redirect back and show "Connected"

#### Test Dropbox Connection:
1. Click "Connect Dropbox"
2. Should open Dropbox OAuth popup
3. Grant permissions
4. Should redirect back and show "Connected"

---

## 🔍 Troubleshooting

### "Failed to start Gmail authentication"
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`
- Verify redirect URI matches: `http://localhost:8000/gmail/callback`
- Make sure you're added as a test user in Google Cloud Console

### "Application failed to respond" (Dropbox)
- Check `DROPBOX_APP_KEY` and `DROPBOX_APP_SECRET` in `backend/.env`
- Verify redirect URI is added in Dropbox app settings: `http://localhost:8000/dropbox/callback`

### Backend not responding
- Check if backend is running: `lsof -i:8000`
- Check backend logs for errors
- Verify `.env` file exists in `backend/` directory

### "OpenAI API Error"
- Verify `OPENAI_API_KEY` starts with `sk-`
- Check your OpenAI account has credits: https://platform.openai.com/usage

---

## 📝 Current Backend Configuration

**Location**: `/Users/philipcameron/smart-receipts/backend/.env`

**What you need to replace**:
- [ ] `OPENAI_API_KEY` - Get from OpenAI
- [ ] `GOOGLE_CLIENT_ID` - Get from Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - Get from Google Cloud Console
- [ ] `GMAIL_OAUTH_CREDENTIALS` - Download JSON from Google Cloud Console
- [ ] `DROPBOX_APP_KEY` - Get from Dropbox App Console
- [ ] `DROPBOX_APP_SECRET` - Get from Dropbox App Console

---

## 💰 Cost Estimate

**Development (testing)**:
- Google OAuth: Free
- Dropbox OAuth: Free
- OpenAI: ~$1-5/month for testing
- Supabase: Free tier (optional)

**Production (with users)**:
- Google OAuth: Free
- Dropbox OAuth: Free
- OpenAI: ~$0.01-0.05 per receipt processed
- Supabase: Free tier up to certain limits, then paid

---

## ✅ Quick Start Checklist

1. [ ] Get OpenAI API key
2. [ ] Create Google Cloud project
3. [ ] Enable Gmail API
4. [ ] Create OAuth credentials
5. [ ] Download Google credentials JSON
6. [ ] Create Dropbox app
7. [ ] Get Dropbox app key and secret
8. [ ] Update `backend/.env` with all credentials
9. [ ] Restart backend server
10. [ ] Test Gmail OAuth
11. [ ] Test Dropbox OAuth

---

## 🎯 Next Steps

Once you have the credentials configured:
1. Test locally to make sure everything works
2. When ready for production:
   - Deploy backend to Railway, Fly.io, or similar
   - Update OAuth redirect URIs to production URLs
   - Set environment variables in hosting platform
   - Deploy frontend to Vercel/Netlify

---

**Created**: 2025-10-23
**Backend Status**: ✅ Running on http://localhost:8000
**Configuration Needed**: API credentials for Gmail, Dropbox, OpenAI
