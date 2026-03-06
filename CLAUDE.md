# Smart Receipts

Receipt scanning and management app. Extracts data from receipts via camera/upload, Gmail, and Dropbox. Supports multi-language receipts with currency conversion.

## Tech Stack

### Backend (Python)
- **Framework:** FastAPI + Uvicorn
- **Database:** PostgreSQL via asyncpg, Supabase for auth
- **AI:** OpenAI API for receipt text extraction
- **Integrations:** Gmail API, Dropbox API
- **Auth:** Supabase JWT verification

### Frontend (TypeScript)
- **Framework:** React 18 + Vite
- **Routing:** React Router DOM 6
- **Styling:** Tailwind CSS 3 + shadcn/ui (Radix UI primitives)
- **Auth:** Supabase JS client
- **i18n:** i18next with browser language detection
- **PDF export:** jsPDF
- **PWA:** vite-plugin-pwa
- **Package manager:** Yarn 4 (with PnP)

### Deployment
- **Frontend:** Vercel (Vite build)
- **Backend:** Separate hosting (FastAPI)

## Project Structure

```
backend/
  app/
    apis/          # API route modules
      receipt_extraction/  # OCR/AI receipt parsing
      gmail/               # Gmail receipt scanning
      dropbox_integration/ # Dropbox receipt import
      upload_tracking/     # Track processed receipts
      diagnostics/         # Health checks
      language_detection/  # Multi-language support
    auth/          # Supabase JWT auth
    libs/          # Shared utilities (database, currency converter)
    config.py      # Environment variable settings
frontend/
  src/
    pages/         # Route pages (App, UploadReceipts, GmailSetup, DropboxSetup, SignIn)
    components/    # Shared components (AppProvider, CameraCapture, LanguageSelector)
    extensions/shadcn/  # shadcn/ui components
    app/auth/      # Supabase auth utilities
    utils/         # Helpers (i18n, API error handling, domain validation)
    constants/     # Theme defaults
```

## Commands

### Frontend
- `yarn dev` - Start Vite dev server (port 5173)
- `yarn build` - Production build
- `yarn lint` - ESLint

### Backend
- `uvicorn app:app --reload` - Start FastAPI dev server (port 8000)
- `pip install -r requirements.txt` - Install dependencies

## Key Features
- Camera capture and image upload for receipt scanning
- Gmail integration - scan inbox for receipt emails
- Dropbox integration - import receipts from Dropbox
- OpenAI-powered receipt data extraction (vendor, amount, date, items)
- Multi-language receipt support with language detection
- Currency conversion for international receipts
- PDF export of receipt data
- PWA support for mobile use
- Inline editing of extracted receipt fields

## Environment Variables

See `backend/app/config.py` for all backend env vars. Key ones:
- `OPENAI_API_KEY` - Receipt text extraction
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Gmail integration
- `DROPBOX_APP_KEY` / `DROPBOX_APP_SECRET` - Dropbox integration
- `DATABASE_URL` - PostgreSQL connection
- `SUPABASE_URL` / `SUPABASE_JWT_SECRET` - Auth
- `FRONTEND_URL` / `BACKEND_URL` - App URLs

## Database

PostgreSQL with Supabase. Migration files in root: `supabase-migration.sql` and `supabase-migration-upload-tracking.sql`.
