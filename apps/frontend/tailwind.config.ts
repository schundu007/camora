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
          DEFAULT: '#26619C',
          hover: '#1A4F86',
          subtle: 'rgba(38,97,156,0.10)',
          muted: 'rgba(38,97,156,0.18)',
        },
        success: {
          DEFAULT: '#26619C',
          subtle: 'rgba(38,97,156,0.10)',
          muted: 'rgba(38,97,156,0.18)',
        },
        warning: {
          DEFAULT: '#C9A227',
          subtle: 'rgba(201,162,39,0.10)',
          muted: 'rgba(201,162,39,0.18)',
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
          // PRIMARY — Lapis Lazuli (the verb)
          primary:   '#26619C',
          primaryLt: '#3C7AAB',
          primaryDk: '#1A4F86',
          // SECONDARY — Gold Leaf (the noun, illuminated manuscript)
          goldLeaf:  '#C9A227',
          goldLeafLt:'#D9B543',
          goldLeafDk:'#A88817',
          goldLeaf50:'#FBF6E3',
          // copper* and teal* are back-compat aliases pointing at gold.
          copper:    '#C9A227',
          copperLt:  '#D9B543',
          copperDk:  '#A88817',
          copper50:  '#FBF6E3',
          teal:      '#C9A227',
          tealLt:    '#D9B543',
          tealDk:    '#A88817',
          teal50:    '#FBF6E3',
          // TERTIARY — amber (warm sibling to gold leaf)
          amber:     '#AB6400',
          amberLt:   '#C07A00',
          amberDk:   '#864E00',
          amberMist: '#FAF0E0',
          // SUBSTRATE — cream paper
          cream:     '#FAF7F0',
          creamLt:   '#FDFCF7',
          // TEXT — warm near-black ink
          warmInk:   '#1C1917',
          warmInkMid:'#44403C',
          warmInkLt: '#A8A29E',
          // DARK — deep-ocean lapis echo
          void:      '#0F1B2D',
          plumVoid:  '#0F1B2D',
          // Chrome neutrals (use sparingly — borders only)
          midnight:  '#0F172A',
          steel:     '#475569',
          mist:      '#FAF7F0',
          surface:   '#FDFCF7',
          // Tonal ramp — lapis scale (back-compat name `blue`)
          blue: {
            50:  '#EAF0F7',
            100: '#C5D4E5',
            200: '#95B0CD',
            300: '#5985B6',
            400: '#3C7AAB',
            500: '#26619C',
            600: '#1A4F86',
            700: '#0F3E70',
            800: '#082D5A',
            900: '#051C40',
          },
          // Gold leaf ramp (back-compat name `gold`)
          gold: {
            50:  '#FBF6E3',
            100: '#F4E5A0',
            200: '#E8CC6A',
            300: '#D9B543',
            400: '#C9A227',
            500: '#A88817',
            600: '#876D10',
            700: '#66520A',
            800: '#443704',
            900: '#221C02',
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
