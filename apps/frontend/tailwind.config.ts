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
          DEFAULT: '#064E3B',
          hover: '#047857',
          subtle: 'rgba(6,78,59,0.10)',
          muted: 'rgba(6,78,59,0.18)',
        },
        success: {
          DEFAULT: '#064E3B',
          subtle: 'rgba(6,78,59,0.10)',
          muted: 'rgba(6,78,59,0.18)',
        },
        warning: {
          DEFAULT: '#B45309',
          subtle: 'rgba(180,83,9,0.10)',
          muted: 'rgba(180,83,9,0.18)',
        },
        danger: {
          DEFAULT: '#EF4444',
          subtle: 'rgba(239,68,68,0.10)',
          muted: 'rgba(239,68,68,0.18)',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#FAF7F0',
        },
        // Neutral slate ramp for low-contrast chrome (borders, dividers).
        // Brand surfaces use camora.cream / camora.creamLt instead.
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
          // PRIMARY — Library emerald (the verb)
          primary:   '#064E3B',
          primaryLt: '#047857',
          primaryDk: '#022C22',
          // SECONDARY — copper (the noun, premium brass)
          copper:    '#B45309',
          copperLt:  '#D97706',
          copperDk:  '#92400E',
          copper50:  '#FEF3E2',
          // teal* are back-compat aliases pointing at copper.
          teal:      '#B45309',
          tealLt:    '#D97706',
          tealDk:    '#92400E',
          teal50:    '#FEF3E2',
          // TERTIARY — amber (warm pair with copper)
          amber:     '#AB6400',
          amberLt:   '#C07A00',
          amberDk:   '#864E00',
          amberMist: '#FAF0E0',
          // SUBSTRATE — cream paper, replaces white where ink + warmth land
          cream:     '#FAF7F0',
          creamLt:   '#FDFCF7',
          // TEXT — warm near-black ink, pairs with cream
          warmInk:   '#1C1917',
          warmInkMid:'#44403C',
          warmInkLt: '#A8A29E',
          // DARK — forest void with emerald echo
          void:      '#0A2419',
          plumVoid:  '#0A2419',
          // Chrome neutrals (use sparingly — borders only)
          midnight:  '#0F172A',
          steel:     '#475569',
          mist:      '#FAF7F0',
          surface:   '#FDFCF7',
          // Tonal ramp — emerald scale (back-compat name `blue`)
          blue: {
            50:  '#ECFDF5',
            100: '#D1FAE5',
            200: '#A7F3D0',
            300: '#6EE7B7',
            400: '#34D399',
            500: '#10B981',
            600: '#059669',
            700: '#047857',
            800: '#065F46',
            900: '#064E3B',
          },
          // Copper / amber ramp (back-compat name `gold`)
          gold: {
            50:  '#FEF3E2',
            100: '#FDE4B5',
            200: '#FBBF24',
            300: '#F59E0B',
            400: '#D97706',
            500: '#B45309',
            600: '#92400E',
            700: '#78350F',
            800: '#451A03',
            900: '#1A0E00',
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
