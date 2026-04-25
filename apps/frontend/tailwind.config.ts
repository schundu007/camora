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
          DEFAULT: '#EC4899',
          hover: '#BE185D',
          subtle: 'rgba(236,72,153,0.10)',
          muted: 'rgba(236,72,153,0.18)',
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
          DEFAULT: '#EF4444',
          subtle: 'rgba(239,68,68,0.10)',
          muted: 'rgba(239,68,68,0.18)',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#F8FAFC',
        },
        // Neutral slate ramp for backgrounds, borders, low-contrast chrome.
        // The accent is intentionally NOT in this scale — only --accent / camora.primary.
        frost: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        camora: {
          // PRIMARY — magenta (the verb)
          primary:   '#EC4899',
          primaryLt: '#F472B6',
          primaryDk: '#BE185D',
          // SECONDARY — teal (the noun, split-complement of magenta)
          teal:      '#0F766E',
          tealLt:    '#14B8A6',
          tealDk:    '#134E4A',
          teal50:    '#F0FDFA',
          // TERTIARY — amber (the adjective, analogous warm pair)
          amber:     '#AB6400',
          amberLt:   '#C07A00',
          amberDk:   '#864E00',
          amberMist: '#FAF0E0',
          // SUBSTRATE — cream paper, replaces white where ink + warmth land
          cream:     '#FAF7F0',
          creamLt:   '#FDFCF7',
          // TEXT — warm ink, pairs with cream
          warmInk:   '#292524',
          warmInkMid:'#57534E',
          warmInkLt: '#A8A29E',
          // DARK — plum-void with magenta echo
          void:      '#1A0B1F',
          plumVoid:  '#1A0B1F',
          // Chrome neutrals (use sparingly — borders only, never fills)
          midnight:  '#0F172A',
          steel:     '#475569',
          mist:      '#FAF7F0',
          surface:   '#FDFCF7',
          // Tonal ramps. `blue` keeps its name for back-compat but is now
          // the magenta-pink ramp; `gold` is amber.
          blue: {
            50:  '#FDF2F8',
            100: '#FCE7F3',
            200: '#FBCFE8',
            300: '#F472B6',
            400: '#EC4899',
            500: '#BE185D',
            600: '#9D174D',
            700: '#831843',
            900: '#500724',
          },
          gold: {
            50:  '#FAF0E0',
            100: '#F0D4A0',
            200: '#D9A84A',
            300: '#C07A00',
            400: '#AB6400',
            500: '#864E00',
            600: '#5E3600',
            700: '#3A2000',
            900: '#1A0E00',
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
