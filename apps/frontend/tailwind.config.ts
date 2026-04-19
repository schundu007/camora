import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['Winter Kei', 'Clash Display', 'Satoshi', 'system-ui', 'sans-serif'],
        code: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
        logo: ['Clash Display', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#22D3EE',
          hover: '#06B6D4',
          subtle: 'rgba(34,211,238,0.10)',
          muted: 'rgba(34,211,238,0.18)',
        },
        success: {
          DEFAULT: '#34D399',
          subtle: 'rgba(52,211,153,0.10)',
          muted: 'rgba(52,211,153,0.18)',
        },
        warning: {
          DEFAULT: '#FBBF24',
          subtle: 'rgba(251,191,36,0.10)',
          muted: 'rgba(251,191,36,0.18)',
        },
        danger: {
          DEFAULT: '#F87171',
          subtle: 'rgba(248,113,113,0.10)',
          muted: 'rgba(248,113,113,0.18)',
        },
        surface: {
          DEFAULT: '#E8F1FC',
          elevated: '#DDE9F7',
        },
        frost: {
          50: '#F0F7FF',
          100: '#E8F1FC',
          200: '#DDE9F7',
          300: '#C4D9F2',
          400: '#A8C8EB',
          500: '#7096BF',
          600: '#4A7AAD',
          700: '#2D5F8A',
          800: '#1E3A5F',
          900: '#0F172A',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
