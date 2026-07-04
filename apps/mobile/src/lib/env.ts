/**
 * Reads and validates the app's public environment. Expo inlines only
 * `EXPO_PUBLIC_*` variables into the bundle; secrets never reach the client
 * (SPEC §7.1). Fails fast so a misconfigured build is caught at startup.
 */
interface MobileEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function readEnv(): MobileEnv {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Configuração ausente: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY (ver .env.example).',
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export const env = readEnv();
