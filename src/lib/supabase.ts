
import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback to active project if undefined or pointing to invalid/non-existent legacy domain
const isInvalidUrl = !rawUrl || rawUrl.includes('oankhiniuxgphdloqklr');

const supabaseUrl = isInvalidUrl
  ? 'https://zhnbrftspwzacarpjqxd.supabase.co'
  : rawUrl;

const supabaseAnonKey = isInvalidUrl
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobmJyZnRzcHd6YWNhcnBqcXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzQyNDgsImV4cCI6MjA4NTgxMDI0OH0.56Jis1mnVl-Rfof091ejuHR5g8oINumZKiwGL7bygVA'
  : rawAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

