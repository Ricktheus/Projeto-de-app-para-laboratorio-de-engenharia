import type { Config } from 'tailwindcss';

/**
 * "Concreto & Sinalização" design tokens (PLANO_NOVO_APP.md §6).
 *
 * - Warm concrete neutrals replace Tailwind's cool `gray`, so every existing
 *   `gray-*` utility inherits the new identity.
 * - Graphite is the structural/primary colour (`brand`); signal yellow
 *   (`sinal`) is reserved for "act now" — at most one yellow element per screen.
 * - Cobalt is only for links, selection and info; violet (`ia`) only for
 *   unconfirmed AI suggestions.
 * Contrast ratios (WCAG 2.x) are documented in the plan, §6.2.
 */
const concreto = {
  0: '#FFFFFF',
  25: '#FAFAF8',
  50: '#F3F3F0',
  100: '#E7E7E2',
  200: '#D2D2CB',
  300: '#B4B4AC',
  400: '#8E8E86', // icons only (3.3:1)
  500: '#6E6E67', // secondary text (5.1:1)
  600: '#55554F', // supporting text (7.2:1)
  700: '#3D3D38',
  800: '#2A2A27',
  900: '#1B1B19',
  950: '#111110',
};

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: concreto,
        concreto,
        grafite: { DEFAULT: '#17181A', 700: '#2A2A27', 600: '#3A3B3E' },
        sinal: { 50: '#FFF7D6', 100: '#FFEDA8', 500: '#FFC21A', 600: '#E6A800' },
        cobalto: { 50: '#ECF0FE', 100: '#D9E1FD', 600: '#2F54EB', 700: '#2441C2' },
        ia: { 50: '#EFEBFF', 600: '#5B3FD9' },
        terra: '#9C6B3F',
        agua: '#1590A8',
        brand: {
          DEFAULT: '#17181A', // graphite primary (17:1 on concreto-25)
          dark: '#2A2A27',
          fg: '#FFFFFF',
        },
        danger: { DEFAULT: '#B3261E', fg: '#FFFFFF', soft: '#FDE8E8' },
        success: { DEFAULT: '#157A45', fg: '#FFFFFF', soft: '#E3F5EA' },
        warning: { DEFAULT: '#A85A00', fg: '#FFFFFF', soft: '#FFF0DB' },
        info: { DEFAULT: '#2F54EB', fg: '#FFFFFF', soft: '#ECF0FE' },
        neutral: { DEFAULT: '#3D3D38', fg: '#FFFFFF' },
        red: { 50: '#FDE8E8', 200: '#F5C2C0', 700: '#B3261E' },
        green: { 50: '#E3F5EA', 700: '#157A45' },
        amber: { 50: '#FFF0DB', 700: '#A85A00' },
        yellow: { 50: '#FFF7D6', 900: '#5C4300' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        display: ['"Barlow Semi Condensed"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      minHeight: {
        // Office density (plan §6.5: 32px min target, 36–40px controls). The
        // gloved-hand 56dp targets live in the mobile app (Campo / Bancada).
        touch: '40px',
      },
      fontSize: {
        field: ['0.9375rem', { lineHeight: '1.375rem' }],
        kpi: ['2.5rem', { lineHeight: '1', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        // Plan §6.5: radius 6 in the office UI — crisper than the old 12–16px.
        xl: '8px',
        '2xl': '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,24,26,0.04), 0 1px 1px rgba(23,24,26,0.03)',
        raised: '0 4px 16px -4px rgba(23,24,26,0.12), 0 2px 4px rgba(23,24,26,0.05)',
        drawer: '-16px 0 48px -12px rgba(23,24,26,0.25)',
      },
      transitionTimingFunction: {
        rastro: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in': {
          from: { transform: 'translateX(24px)', opacity: '0' },
          to: { transform: 'none', opacity: '1' },
        },
        pulse_dot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.35' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms cubic-bezier(0.2,0,0,1)',
        'slide-in': 'slide-in 240ms cubic-bezier(0.2,0,0,1)',
        'pulse-dot': 'pulse_dot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
