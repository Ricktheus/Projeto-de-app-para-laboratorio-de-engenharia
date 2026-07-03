/** @type {import('eslint').Linter.Config} */
// TypeScript-strict lint for the monorepo. Only the toolchain actually used
// by S001 is wired up (typescript-eslint + import + prettier). The React /
// React-Hooks plugins listed in the SPEC are added in S003, when the apps
// (which contain the first React code) land — enabling them now would be dead
// configuration.
module.exports = {
  root: true,
  env: { es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: ['node_modules/', 'dist/', '**/database.types.ts', '*.config.*', '.eslintrc.cjs'],
  rules: {
    // Domain rules live in packages/shared; keep app/infra code strict.
    '@typescript-eslint/no-explicit-any': 'error',
    'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    'import/no-unresolved': 'off',
  },
};
