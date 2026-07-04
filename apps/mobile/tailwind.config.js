/** @type {import('tailwindcss').Config} */
// Mirrors apps/web tokens so mobile and web share one visual language. The
// scales are chosen for AA+ contrast and the >=56dp ergonomic target (SPEC §1.3).
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1d4ed8',
          dark: '#1e40af',
          fg: '#ffffff',
        },
        danger: { DEFAULT: '#b91c1c', fg: '#ffffff' },
        success: { DEFAULT: '#15803d', fg: '#ffffff' },
        neutral: { DEFAULT: '#374151', fg: '#ffffff' },
      },
    },
  },
  plugins: [],
};
