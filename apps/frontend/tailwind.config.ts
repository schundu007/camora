import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['Clash Display', 'Satoshi', 'system-ui', 'sans-serif'],
        code: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
        logo: ['Clash Display', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#76B900',
          light: '#91C733',
          dark: '#5E9400',
        },
        brand: {
          DEFAULT: '#76B900',
          50: '#F7FDE8',
          100: '#ECFACC',
          200: '#D5F58A',
          300: '#CFFF40',
          400: '#91C733',
          500: '#76B900',
          600: '#5E9400',
          700: '#4A7500',
          800: '#375800',
          900: '#264000',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
