/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/react-native/extend-expect', '<rootDir>/jest.setup.ts'],
  // Transpile the ESM published by RN/Expo/NativeWind/Supabase and our workspace
  // packages (Jest defaults to ignoring all of node_modules).
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?(?:jest-)?(?:react-native|@react-native(?:-community)?|expo(?:nent)?|@expo(?:nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|@supabase/.*|@concreto/.*))',
  ],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
};
