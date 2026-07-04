/** @type {import('eslint').Linter.Config} */
// TypeScript-strict lint for the monorepo. The React / React-Hooks plugins are
// scoped (via `overrides`) to `apps/**` — the only place React code lives —
// so the framework-agnostic packages (shared, supabase) stay lint-clean without
// pulling in JSX parsing they don't need.
module.exports = {
  root: true,
  env: { es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.expo/',
    '**/database.types.ts',
    '*.config.*',
    '.eslintrc.cjs',
  ],
  rules: {
    // Domain rules live in packages/shared; keep app/infra code strict.
    '@typescript-eslint/no-explicit-any': 'error',
    'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    'import/no-unresolved': 'off',
  },
  overrides: [
    {
      // React app code (mobile + web): enable JSX + React lint rules here only.
      files: ['apps/**/*.{ts,tsx}'],
      env: { browser: true },
      parserOptions: { ecmaFeatures: { jsx: true } },
      plugins: ['react', 'react-hooks'],
      extends: [
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'plugin:react-hooks/recommended',
      ],
      settings: { react: { version: '18.3' } },
      rules: {
        // The Zod schemas / TS types make prop-types redundant.
        'react/prop-types': 'off',
      },
    },
  ],
};
