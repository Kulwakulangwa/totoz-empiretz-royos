import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env['PUBLIC_SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'] || process.env['SUPABASE_URL'];
const SUPABASE_ANON_KEY = process.env['PUBLIC_SUPABASE_ANON_KEY'] || process.env['VITE_SUPABASE_ANON_KEY'] || process.env['SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing public Supabase env vars (client may fail in browser).');
}

export const supabaseClient = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '');
