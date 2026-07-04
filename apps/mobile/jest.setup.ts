// Provide dummy public env so any module that transitively reads it does not
// fail-fast during unit tests (the real values come from EXPO_PUBLIC_* at build).
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
