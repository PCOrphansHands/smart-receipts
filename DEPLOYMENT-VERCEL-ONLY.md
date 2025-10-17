# Smart Receipts - Vercel-Only Deployment (Simplified)

Deploy the entire Smart Receipts app on Vercel Pro + Supabase. No Railway needed!

## Architecture

- **Frontend**: React + Vite → Vercel (Static)
- **Backend**: FastAPI + Python → Vercel (Serverless Functions)
- **Database**: PostgreSQL → Supabase

## Prerequisites

1. [Vercel Pro Account](https://vercel.com) (You have this! ✅)
2. [Supabase Account](https://supabase.com) (Free tier is fine)
3. [OpenAI API Key](https://platform.openai.com/api-keys)
4. [Google Cloud Project](https://console.cloud.google.com) (For Gmail OAuth + Google Sign-In)
5. [Dropbox App](https://www.dropbox.com/developers/apps)

---

## Part 1: Database Setup (Supabase)

### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New project"
3. Set name, password, and region
4. Click "Create new project"

### 1.2 Run Database Migration

1. Go to **SQL Editor** in Supabase
2. Copy contents of `supabase-migration.sql`
3. Paste and click "Run"
4. Verify tables in **Table Editor**

### 1.3 Get Database Connection String

1. **Project Settings** → **Database**
2. Copy **URI** connection string
3. Replace `[YOUR-PASSWORD]` with your actual password
4. Save this for later

### 1.4 Get Supabase API Credentials

1. **Project Settings** → **API**
2. Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
3. Copy **anon public** key
4. Save these for frontend configuration

### 1.5 Configure Google OAuth Provider

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Google** provider
3. You'll need to set up Google OAuth credentials first (see Part 5)
4. Add your Google Client ID and Client Secret
5. Copy the **Callback URL** (e.g., `https://xxxxx.supabase.co/auth/v1/callback`)
6. Add this callback URL to your Google OAuth app

---

## Part 2: Backend Deployment (Vercel)

### 2.1 Deploy Backend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Import `PCOrphansHands/smart-receipts`
3. Configure:
   - **Project Name**: `smart-receipts-backend`
   - **Root Directory**: `backend`
   - **Framework Preset**: Other
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty

### 2.2 Add Environment Variables

In Vercel project settings → Environment Variables:

```bash
ENVIRONMENT=production
FRONTEND_URL=https://smart-receipts.vercel.app
BACKEND_URL=https://smart-receipts-backend.vercel.app

# Supabase (from Supabase Dashboard → API)
SUPABASE_URL=https://xxxxx.supabase.co

# Database (from Supabase Dashboard → Database)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# OpenAI
OPENAI_API_KEY=sk-...

# Google OAuth (for Gmail API)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GMAIL_OAUTH_CREDENTIALS={"web":{...}}

# Dropbox
DROPBOX_APP_KEY=xxx
DROPBOX_APP_SECRET=xxx
```

### 2.3 Deploy

Click "Deploy" and wait for it to finish. Your backend will be at:
`https://smart-receipts-backend.vercel.app`

---

## Part 3: Frontend Deployment (Vercel)

### 3.1 Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Import `PCOrphansHands/smart-receipts` (same repo)
3. Configure:
   - **Project Name**: `smart-receipts`
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `yarn build`
   - **Output Directory**: `dist`

### 3.2 Add Environment Variables

```bash
# Supabase (from Supabase Dashboard → API)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key

# Backend API URL (after backend deployment)
VITE_API_URL=https://smart-receipts-backend.vercel.app
```

### 3.3 Deploy

Click "Deploy". Your frontend will be at:
`https://smart-receipts.vercel.app`

---

## Part 4: Update URLs

After both deployments:

1. **Update Backend Environment Variables:**
   - Go to backend project settings
   - Update `FRONTEND_URL` to your actual frontend URL
   - Update `BACKEND_URL` to your actual backend URL
   - Redeploy backend

2. **Update Frontend API URL:**
   - Edit `frontend/vite.config.ts`
   - Update `__API_URL__` to point to your backend URL
   - Commit and push (triggers auto-redeploy)

---

## Part 5: OAuth Configuration

### 5.1 Google OAuth (For Google Sign-In + Gmail API)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. **Enable APIs**:
   - Gmail API (for email scanning)
4. **Create OAuth 2.0 Credentials** (Credentials → Create Credentials → OAuth client ID):
   - Application type: Web application
   - **Authorized redirect URIs**:
     - `https://xxxxx.supabase.co/auth/v1/callback` (Supabase auth callback)
     - `https://smart-receipts-backend.vercel.app/routes/gmail/auth/callback` (Gmail API callback)
     - `http://localhost:8000/routes/gmail/auth/callback` (dev)
5. Copy **Client ID** and **Client Secret**
6. **For Gmail API**: Download the full credentials JSON and set it as `GMAIL_OAUTH_CREDENTIALS` in backend
7. **For Supabase Auth**: Add Client ID and Client Secret to Supabase (Part 1.5)

### 5.2 Dropbox OAuth

1. [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Create app with Full Dropbox access
3. Add redirect URIs:
   - `https://smart-receipts-backend.vercel.app/routes/dropbox/callback`
   - `http://localhost:8000/routes/dropbox/callback` (dev)
4. Copy App Key → `DROPBOX_APP_KEY`
5. Copy App Secret → `DROPBOX_APP_SECRET`

---

## Part 6: Test Your App

1. Visit `https://smart-receipts.vercel.app`
2. Sign in with Google (via Supabase Auth)
3. Connect Gmail for email scanning
4. Connect Dropbox for storage
5. Upload a test receipt or scan Gmail
6. Verify receipts appear in Dropbox

---

## Benefits of Vercel-Only Setup

✅ **Single Platform** - Everything in one place
✅ **No Extra Costs** - Already included in Pro plan
✅ **Auto-scaling** - Handles traffic spikes
✅ **60s Timeout** - Plenty for OpenAI/Gmail operations
✅ **Global CDN** - Fast everywhere
✅ **Git Integration** - Auto-deploy on push

---

## Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
yarn install
cp .env.example .env
# Edit .env
yarn dev
```

---

## Troubleshooting

### Backend deployment fails
- Check Vercel build logs
- Ensure all Python dependencies are in requirements.txt
- Verify `main.py` exists in backend root

### Frontend can't reach backend
- Verify CORS allows your frontend domain
- Check `FRONTEND_URL` and `BACKEND_URL` are correct
- Inspect browser console for errors

### Vercel timeout errors
- Check which endpoint is timing out
- OpenAI calls should be < 10s
- Gmail scanning should be < 30s
- If consistent timeouts, consider batch processing

---

## Cost Estimate

- **Vercel Pro**: Already paying (~$20/month)
- **Supabase**: Free tier (500MB database)
- **Total Additional**: $0/month 🎉

---

## Next Steps

- Set up custom domain in Vercel
- Enable Vercel Analytics
- Set up Sentry for error tracking
- Configure Supabase backups
- Add monitoring alerts
