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
          DEFAULT: '#E63946',
          hover: '#B91D2C',
          subtle: 'rgba(230,57,70,0.10)',
          muted: 'rgba(230,57,70,0.18)',
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
          DEFAULT: '#C2185B',
          subtle: 'rgba(194,24,91,0.10)',
          muted: 'rgba(194,24,91,0.18)',
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
          // Brand accent — the only red in the palette.
          primary:   '#E63946',
          primaryLt: '#FF6B7A',
          primaryDk: '#B91D2C',
          // Neutrals for chrome / surfaces — slate.
          void:      '#050C1A',
          midnight:  '#0F172A',
          steel:     '#475569',
          mist:      '#F1F5F9',
          surface:   '#F8FAFC',
          // Amber accent — pairs with primary for the farmer/wheat feel.
          amber:     '#AB6400',
          amberLt:   '#C07A00',
          amberDk:   '#864E00',
          amberMist: '#FAF0E0',
          // Tonal ramps. `blue` keeps its name for back-compat but is now
          // the tomato/red ramp; `gold` is amber.
          blue: {
            50:  '#FCE5E8',
            100: '#F9C5CC',
            200: '#F49AA3',
            300: '#FF6B7A',
            400: '#E63946',
            500: '#B91D2C',
            600: '#7A1419',
            700: '#5C0D11',
            900: '#1A0508',
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
