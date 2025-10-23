import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
  const errorMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  SUPABASE CONFIGURATION ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Missing or invalid Supabase environment variables.

To fix this:
1. Copy frontend/.env.example to frontend/.env
2. Create a Supabase project at https://supabase.com
3. Get your credentials from Settings → API
4. Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env

See frontend/README.md for detailed setup instructions.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  console.error(errorMessage);

  // In development, show a helpful error. In production, this would be caught by error boundaries.
  if (import.meta.env.DEV) {
    throw new Error('Supabase configuration missing. Check console for details.');
  }
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
