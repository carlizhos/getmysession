
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zhnbrftspwzacarpjqxd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobmJyZnRzcHd6YWNhcnBqcXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzQyNDgsImV4cCI6MjA4NTgxMDI0OH0.56Jis1mnVl-Rfof091ejuHR5g8oINumZKiwGL7bygVA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
