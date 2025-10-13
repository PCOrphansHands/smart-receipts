# Smart Receipts - Deployment Guide

This guide will help you deploy Smart Receipts to Vercel (frontend) and Railway (backend) with Supabase as the database.

## Architecture

- **Frontend**: React + Vite → Vercel (Static Hosting)
- **Backend**: FastAPI + Python → Railway (Server Hosting)
- **Database**: PostgreSQL → Supabase

## Prerequisites

1. [Vercel Account](https://vercel.com)
2. [Railway Account](https://railway.app)
3. [Supabase Account](https://supabase.com)
4. [Stack Auth Account](https://stack-auth.com) (for user authentication)
5. [OpenAI API Key](https://platform.openai.com/api-keys)
6. [Google Cloud Project](https://console.cloud.google.com) (for Gmail OAuth)
7. [Dropbox App](https://www.dropbox.com/developers/apps) (for Dropbox integration)

---

## Part 1: Database Setup (Supabase)

### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New project"
3. Choose organization, enter project name
4. Set a strong database password and save it
5. Select region closest to your users
6. Click "Create new project"

### 1.2 Run Database Migration

1. Once project is created, go to **SQL Editor**
2. Copy the contents of `supabase-migration.sql`
3. Paste into SQL Editor and click "Run"
4. Verify tables are created in **Table Editor**

### 1.3 Get Database Connection String

1. Go to **Project Settings** → **Database**
2. Under "Connection string", select **URI**
3. Copy the connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`)
4. Replace `[YOUR-PASSWORD]` with your actual database password
5. Save this - you'll need it for backend deployment

---

## Part 2: Backend Deployment (Railway)

### 2.1 Deploy to Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and select your repository
4. Railway will detect it's a Python app
5. Configure the build:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 2.2 Configure Environment Variables

In Railway project settings, add these environment variables:

```bash
# Environment
ENVIRONMENT=production

# Application URLs (update after deployment)
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-backend.up.railway.app

# Database (from Supabase)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# OpenAI
OPENAI_API_KEY=sk-...

# Google OAuth (Gmail Integration)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GMAIL_OAUTH_CREDENTIALS={"web":{"client_id":"...","project_id":"...",...}}

# Dropbox OAuth
DROPBOX_APP_KEY=your-dropbox-app-key
DROPBOX_APP_SECRET=your-dropbox-app-secret

# Stack Auth
STACK_SECRET_SERVER_KEY=your-stack-secret-key
```

### 2.3 Get Your Backend URL

1. After deployment, Railway will give you a URL like: `https://your-backend.up.railway.app`
2. Copy this URL - you'll need it for:
   - Frontend environment variables
   - Google OAuth redirect URIs
   - Dropbox OAuth redirect URIs

---

## Part 3: OAuth Configuration

### 3.1 Google OAuth Setup (for Gmail)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Gmail API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API" and enable it
4. Configure OAuth consent screen:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type
   - Fill in app name, user support email, developer contact
   - Add scopes: `gmail.readonly`, `gmail.modify`
5. Create OAuth credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Add Authorized redirect URIs:
     - `https://your-backend.up.railway.app/routes/gmail/auth/callback`
     - `http://localhost:8000/routes/gmail/auth/callback` (for local dev)
6. Download JSON and set as `GMAIL_OAUTH_CREDENTIALS` in Railway

### 3.2 Dropbox OAuth Setup

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose:
   - **Scoped access**
   - **Full Dropbox** access
   - Give it a name
4. In app settings:
   - Note down the **App key** (set as `DROPBOX_APP_KEY`)
   - Note down the **App secret** (set as `DROPBOX_APP_SECRET`)
   - Add Redirect URIs:
     - `https://your-backend.up.railway.app/routes/dropbox/callback`
     - `http://localhost:8000/routes/dropbox/callback` (for local dev)
5. In **Permissions** tab, enable:
   - `files.content.read`
   - `files.content.write`
   - `files.metadata.read`
   - `files.metadata.write`

---

## Part 4: Frontend Deployment (Vercel)

### 4.1 Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `yarn build`
   - **Output Directory**: `dist`
   - **Install Command**: `yarn install`

### 4.2 Configure Environment Variables

In Vercel project settings → Environment Variables, add:

```bash
DATABUTTON_PROJECT_ID=e7426d99-15d4-492f-902a-bea7390fc46e
DATABUTTON_CUSTOM_DOMAIN=
DATABUTTON_EXTENSIONS=[{"name":"shadcn","version":"1"},{"name":"stack-auth","version":"1","config":{"projectId":"25106be9-f049-45a8-9c3e-571c211a90df","publishableClientKey":"pck_h38h016byyjmkhy26fq3hfppxhrd9dke5sz8v3mwwht9r","jwksUrl":"https://api.stack-auth.com/api/v1/projects/25106be9-f049-45a8-9c3e-571c211a90df/.well-known/jwks.json","secretRefForSecretServerKey":{"name":"STACK_SECRET_SERVER_KEY"}}}]
```

### 4.3 Update Frontend Config

After deployment, update `frontend/vite.config.ts` to point to your Railway backend:

```typescript
__API_URL__: JSON.stringify("https://your-backend.up.railway.app"),
__WS_API_URL__: JSON.stringify("wss://your-backend.up.railway.app"),
```

### 4.4 Get Your Frontend URL

1. After deployment, Vercel will give you a URL like: `https://your-app.vercel.app`
2. Update the `FRONTEND_URL` environment variable in Railway with this URL
3. Redeploy Railway backend to apply the change

---

## Part 5: Final Configuration

### 5.1 Update Backend CORS

The backend is already configured to accept requests from your frontend URL. Make sure the `FRONTEND_URL` in Railway matches your Vercel deployment URL.

### 5.2 Update OAuth Redirect URIs

Go back to Google Cloud Console and Dropbox App Console and verify the redirect URIs match your deployed backend URL.

### 5.3 Test the Application

1. Visit your Vercel URL
2. Sign up / Sign in with Stack Auth
3. Connect Gmail (test OAuth flow)
4. Connect Dropbox (test OAuth flow)
5. Try uploading a receipt
6. Try scanning Gmail for receipts

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your values
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
yarn install
cp .env.example .env
# Edit .env with your values
yarn dev
```

---

## Troubleshooting

### Backend won't start
- Check Railway logs for errors
- Verify all environment variables are set
- Ensure DATABASE_URL is correct
- Check Supabase connection limits

### Frontend can't connect to backend
- Verify CORS is configured correctly
- Check that FRONTEND_URL in Railway matches your Vercel URL
- Inspect browser console for CORS errors

### OAuth not working
- Verify redirect URIs match exactly
- Check that secrets are set correctly
- Ensure OAuth apps are published (not in testing mode)

### Database connection issues
- Verify Supabase project is active
- Check DATABASE_URL format
- Ensure IP allowlist includes your Railway region (Supabase → Settings → Database → Connection pooling)

---

## Cost Estimates

- **Vercel**: Free tier (Hobby plan)
- **Railway**: ~$5-10/month (based on usage)
- **Supabase**: Free tier (up to 500MB database)
- **Stack Auth**: Free tier available

---

## Security Notes

1. Never commit `.env` files to git
2. Rotate secrets regularly
3. Use Supabase Row Level Security if handling sensitive data
4. Enable 2FA on all service accounts
5. Monitor Railway logs for suspicious activity

---

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/your-repo/issues)
- Review Railway and Vercel logs
- Check Supabase database logs

---

## Next Steps

- Set up custom domain in Vercel
- Configure custom domain in Railway
- Set up monitoring with Sentry
- Enable Supabase real-time features
- Add database backups
