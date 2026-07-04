/**
 * Reads and validates the browser-safe environment. Fails fast at startup if a
 * required variable is missing, so a misconfigured deploy is caught immediately
 * instead of at the first Supabase call. Only the public anon key lives here —
 * secrets stay in Edge Function env (SPEC §7.1).
 */
interface WebEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function readEnv(): WebEnv {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Configuração ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ver .env.example).',
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export const env = readEnv();
