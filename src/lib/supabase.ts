/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Environment variable validation
// These MUST be set in:
//   Local dev  → .env file (copy from .env.example)
//   Vercel     → Dashboard → Project → Settings → Environment Variables
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Throw in development so the developer knows immediately what's wrong.
  // In production this would mean the Vercel env vars are not set.
  const missing: string[] = [];
  if (!supabaseUrl)     missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');

  const message = [
    `[Attendance Pro] Missing required environment variable(s): ${missing.join(', ')}`,
    'For local dev: copy .env.example to .env and fill in your Supabase credentials.',
    'For Vercel:    go to Dashboard → Project → Settings → Environment Variables.',
  ].join('\n');

  // Log clearly so it's visible in the console
  console.error(message);

  // Only throw during development — in production we fail gracefully
  // so the user sees the app shell instead of a white screen
  if (import.meta.env.DEV) {
    throw new Error(message);
  }
}

export const supabase = createClient(
  supabaseUrl  ?? '',
  supabaseAnonKey ?? ''
);
