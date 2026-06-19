import { createClient } from '@supabase/supabase-js';

// Robust Sanitizers for Supabase Credentials
function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  url = url.trim();
  const match = url.match(/https?:\/\/[a-zA-Z0-9-]+\.supabase\.(co|in|net|space)/i);
  if (match) {
    return match[0].replace(/\/+$/, '').trim();
  }
  return url.replace(/^['"]|['"]$/g, '').replace(/\/+$/, '').trim();
}

function sanitizeSupabaseKey(key: string): string {
  if (!key) return '';
  key = key.trim();
  const match = key.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
  if (match) {
    return match[0];
  }
  return key.replace(/^['"]|['"]$/g, '').trim();
}

// Load values dynamically. In production, these will be injected or loaded from env.
const rawSupabaseUrl = typeof window !== 'undefined' 
  ? (window as any)._env_?.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL || ''
  : (typeof process !== 'undefined' ? process.env.SUPABASE_URL || '' : '');

const rawSupabaseAnonKey = typeof window !== 'undefined'
  ? (window as any)._env_?.SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''
  : (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY || '' : '');

const supabaseUrl = sanitizeSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = sanitizeSupabaseKey(rawSupabaseAnonKey);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Log diagnostic settings once
if (typeof window !== 'undefined') {
  const win = window as any;
  if (isSupabaseConfigured) {
    win.__addDiagnosticLog?.('info', '[SUPABASE] Credentials detected, establishing live client connection with database endpoints.', {
      supabaseUrl
    });
    console.log('[SUPABASE] Credentials detected, ready to establish live connection.');
  } else {
    win.__addDiagnosticLog?.('info', '[SUPABASE] Credentials absent or unconfigured. Daily Mart is automatically routing all database state features through local container Sandbox JSON simulation engine.');
    console.log('[SUPABASE] Credentials missing or incomplete. Daily Mart is running in sandbox container mode with local JSON database.');
  }
}

// Safely construct Supabase client, passing placeholders if not configured to avoid initialization crash
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key-1234567890'
);
