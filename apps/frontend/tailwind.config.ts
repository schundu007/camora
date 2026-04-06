import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        code: ['IBM Plex Mono', 'JetBrains Mono', 'monospace'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
