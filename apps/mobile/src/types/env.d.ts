/**
 * Minimal typing for the public env Metro inlines at build time. Only
 * `EXPO_PUBLIC_*` variables reach the client bundle (SPEC §7.1); we avoid
 * pulling in all of `@types/node` just for `process.env`.
 */
declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  };
};
