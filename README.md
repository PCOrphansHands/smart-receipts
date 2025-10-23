# Orphans Hands - Smart Receipts

A comprehensive receipt management application for Orphans Hands organization that helps you scan, organize, and store receipts from Gmail and local uploads to Dropbox.

## Features

- 📧 **Gmail Integration**: Scan your Gmail for receipt emails and extract attachments
- 📷 **Camera Capture**: Take photos of physical receipts directly in the app
- 📤 **File Uploads**: Upload PDF and image receipts from your computer
- 🤖 **AI-Powered Extraction**: Automatically extract vendor, date, amount, and currency from receipts
- 💱 **Multi-Currency Support**: Automatic USD conversion for foreign currencies
- ☁️ **Dropbox Integration**: Securely store receipts in your Dropbox account
- 🌍 **Internationalization**: Support for English, Romanian, and Ukrainian
- 📱 **Progressive Web App (PWA)**: Install on iPhone or Android as a native-like app

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 4
- **Styling**: Tailwind CSS with Shadcn/ui components
- **State Management**: React hooks + Context
- **Authentication**: Supabase
- **Package Manager**: Yarn 4
- **PWA**: Vite PWA Plugin with Workbox

### Backend
- **Framework**: FastAPI (Python)
- **Package Manager**: uv
- **APIs**: Gmail API, Dropbox API, OpenAI Vision API

## Prerequisites

Before you begin, ensure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.9 or higher)
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- [Yarn](https://yarnpkg.com/) (will be enabled via corepack)

You'll also need accounts for:
- [Supabase](https://supabase.com) - For authentication
- [Dropbox](https://www.dropbox.com) - For file storage
- [Google Cloud](https://console.cloud.google.com) - For Gmail API
- [OpenAI](https://platform.openai.com) - For receipt data extraction

## Quick Start

### 1. Install Dependencies

```bash
make
```

Or manually:
```bash
# Frontend
cd frontend
corepack enable
yarn install

# Backend
cd backend
uv sync
```

### 2. Configure Environment Variables

#### Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:8000
```

**How to get Supabase credentials:**
1. Create a project at [supabase.com](https://supabase.com)
2. Go to Settings → API
3. Copy the "Project URL" and "anon/public" key

#### Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your API credentials (see backend README for details).

### 3. Start the Application

**Option A: Using Make (Recommended)**
```bash
# Terminal 1 - Backend
make run-backend

# Terminal 2 - Frontend
make run-frontend
```

**Option B: Manual Start**
```bash
# Terminal 1 - Backend
cd backend
uv run uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
yarn dev
```

### 4. Access the Application

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
smart-receipts/
├── frontend/               # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/         # Main application pages
│   │   ├── components/    # Reusable UI components
│   │   ├── utils/         # Utility functions & helpers
│   │   ├── app/           # App configuration & auth
│   │   └── extensions/    # Third-party component extensions
│   ├── public/            # Static assets
│   └── package.json
│
├── backend/               # FastAPI backend
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic
│   └── main.py          # Application entry point
│
└── Makefile              # Build & run scripts
```

## Development

### Frontend Development

```bash
cd frontend

# Start dev server
yarn dev

# Type checking
npx tsc --noEmit

# Linting
yarn lint

# Build for production
yarn build
```

### Backend Development

```bash
cd backend

# Start dev server
uv run uvicorn main:app --reload

# Run tests (if available)
uv run pytest

# Format code
uv run black .
```

## Important Notes

⚠️ **Backend Required**: The frontend requires the backend to be running for full functionality. Some features (like language detection) will gracefully degrade if the backend is unavailable during development.

ℹ️ **Organization**: This is a private application for Orphans Hands organization. The logo displays the organization's branding.

## Logging

The application uses an environment-aware logging system:

- **Development**: All logs are shown (default level: `info`)
- **Production**: Only errors are logged unless explicitly enabled

To change log level:
```env
# In frontend/.env
VITE_ENABLE_LOGGING=true
VITE_LOG_LEVEL=debug  # debug | info | warn | error
```

## Troubleshooting

### "Supabase configuration error"
- Make sure you've created `.env` from `.env.example`
- Verify your Supabase credentials are correct
- Check that the URL doesn't contain "placeholder"

### "Backend offline" warnings
- Make sure the backend server is running on port 8000
- Check that `VITE_API_URL` in frontend/.env points to the correct backend URL

### Yarn command not found
- Run `corepack enable` to activate Yarn 4
- If that fails, install Node.js v18+ which includes corepack

## Deployment

See separate deployment guides:
- [Vercel Deployment](./DEPLOYMENT-VERCEL-ONLY.md)
- [General Deployment](./DEPLOYMENT.md)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add your license information here]

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in `/docs`
- Review deployment guides for production setup
