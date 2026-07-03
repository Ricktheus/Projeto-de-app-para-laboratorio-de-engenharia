import type { Config } from 'tailwindcss';

/**
 * Web design tokens. The `brand`/`state` scales are picked for AA+ contrast
 * (ratio >= 4.5:1) against white — the ergonomic requirement of SPEC §1.3 that
 * the field/press UI must satisfy (used with gloves / in bright sunlight).
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1d4ed8', // blue-700, 5.9:1 on white
          dark: '#1e40af', // blue-800 (hover/active)
          fg: '#ffffff',
        },
        danger: { DEFAULT: '#b91c1c', fg: '#ffffff' }, // red-700, 6.4:1
        success: { DEFAULT: '#15803d', fg: '#ffffff' }, // green-700, 4.9:1
        warning: { DEFAULT: '#a16207', fg: '#ffffff' }, // yellow-700
        neutral: { DEFAULT: '#374151', fg: '#ffffff' }, // gray-700
      },
      minHeight: {
        touch: '56px', // >= 56dp ergonomic target (SPEC §1.3)
      },
      fontSize: {
        field: ['1.125rem', { lineHeight: '1.5rem' }], // >= 18sp
      },
    },
  },
  plugins: [],
};

export default config;
