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
        accent: {
          DEFAULT: '#2D8CFF',
          hover: '#1A7AE6',
          subtle: 'rgba(45,140,255,0.08)',
          muted: 'rgba(45,140,255,0.15)',
        },
        success: {
          DEFAULT: '#10B981',
          subtle: 'rgba(16,185,129,0.08)',
          muted: 'rgba(16,185,129,0.15)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          subtle: 'rgba(245,158,11,0.08)',
          muted: 'rgba(245,158,11,0.15)',
        },
        danger: {
          DEFAULT: '#EF4444',
          subtle: 'rgba(239,68,68,0.08)',
          muted: 'rgba(239,68,68,0.15)',
        },
        surface: {
          DEFAULT: '#F7F8FA',
          elevated: '#EEF0F4',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
