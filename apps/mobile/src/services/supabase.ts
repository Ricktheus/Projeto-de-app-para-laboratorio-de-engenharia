import 'react-native-url-polyfill/auto';
import { createSupabaseClient } from '@concreto/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { env } from '../lib/env';

/**
 * The single mobile Supabase client (anon key). AsyncStorage persists the auth
 * session across app restarts; RLS enforces authorization server-side. The
 * service_role key is never present on the client (SPEC §7.1).
 */
export const supabase = createSupabaseClient({
  url: env.supabaseUrl,
  anonKey: env.supabaseAnonKey,
  authStorage: AsyncStorage,
  detectSessionInUrl: false,
});
