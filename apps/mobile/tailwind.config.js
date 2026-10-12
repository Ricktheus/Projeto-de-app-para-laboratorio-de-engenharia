/** @type {import('tailwindcss').Config} */
// "Concreto & Sinalização" tokens (PLANO_NOVO_APP.md §6) — mirrors
// apps/web/tailwind.config.ts so mobile and web share one visual language.
// Field ("Sol") targets >= 56dp; the press ("Bancada") uses >= 72dp.
const concreto = {
  0: '#FFFFFF',
  25: '#FAFAF8',
  50: '#F3F3F0',
  100: '#E7E7E2',
  200: '#D2D2CB',
  300: '#B4B4AC',
  400: '#8E8E86',
  500: '#6E6E67',
  600: '#55554F',
  700: '#3D3D38',
  800: '#2A2A27',
  900: '#1B1B19',
  950: '#111110',
};

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        gray: concreto,
        concreto,
        grafite: { DEFAULT: '#17181A', 700: '#2A2A27' },
        sinal: { 50: '#FFF7D6', 500: '#FFC21A', 600: '#E6A800' },
        cobalto: { 50: '#ECF0FE', 600: '#2F54EB' },
        ia: { 50: '#EFEBFF', 600: '#5B3FD9' },
        brand: { DEFAULT: '#17181A', dark: '#2A2A27', fg: '#FFFFFF' },
        danger: { DEFAULT: '#B3261E', fg: '#FFFFFF', soft: '#FDE8E8' },
        success: { DEFAULT: '#157A45', fg: '#FFFFFF', soft: '#E3F5EA' },
        warning: { DEFAULT: '#A85A00', fg: '#FFFFFF', soft: '#FFF0DB' },
        neutral: { DEFAULT: '#3D3D38', fg: '#FFFFFF' },
        red: { 50: '#FDE8E8', 100: '#FDE8E8', 200: '#F5C2C0', 700: '#B3261E', 900: '#7A1A14' },
        green: { 50: '#E3F5EA', 100: '#E3F5EA', 700: '#157A45', 900: '#0E5130' },
        blue: { 50: '#ECF0FE', 100: '#ECF0FE', 700: '#2F54EB', 900: '#1B2F85' },
        yellow: { 50: '#FFF7D6', 100: '#FFF7D6', 900: '#5C4300' },
        amber: { 50: '#FFF0DB', 700: '#A85A00' },
      },
      fontFamily: {
        sans: ['IBMPlexSans_400Regular'],
        medium: ['IBMPlexSans_500Medium'],
        semibold: ['IBMPlexSans_600SemiBold'],
        display: ['BarlowSemiCondensed_600SemiBold'],
        'display-bold': ['BarlowSemiCondensed_700Bold'],
        mono: ['IBMPlexMono_500Medium'],
      },
    },
  },
  plugins: [],
};
