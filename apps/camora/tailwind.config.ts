import type { Config } from 'tailwindcss';

/**
 * AWS Cloudscape parity.
 *
 * Values come from @cloudscape-design/design-tokens (Apache-2.0), the system
 * behind the AWS console. Every KEY here is unchanged so existing utility
 * classes keep resolving — only the values moved.
 *
 * This file used to carry a second palette (Lapis navy + gold leaf + a slate
 * "frost" ramp) that competed with the tokens in globals.css, and five font
 * families that index.html no longer loads. Both are now the AWS set.
 */
const BLUE = {
  50: '#f0fbff', 100: '#d1f1ff', 200: '#b3e0ff', 300: '#75cfff', 400: '#42b4ff',
  500: '#006ce0', 600: '#0057c2', 700: '#003ea8', 800: '#002b66', 900: '#001129',
};
const ORANGE = {
  50: '#fff8f0', 100: '#ffe8cc', 200: '#ffd28f', 300: '#ffb85c', 400: '#ff9900',
  500: '#ec7211', 600: '#c25708', 700: '#96450a', 800: '#6b3208', 900: '#402004',
};
const GREY = {
  50: '#f9f9fb', 100: '#f2f3f3', 200: '#ebebf0', 300: '#c6c6cd', 400: '#8c8c94',
  500: '#656871', 600: '#545b64', 700: '#424650', 800: '#232b37', 900: '#0f141a',
};

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // One UI face, matching Cloudscape's font-family-base/-display/-heading,
      // which are all the same family. JetBrains Mono is kept over AWS's
      // Monaco/Menlo stack — it is a real webfont we load and better for code.
      fontFamily: {
        sans: ['Open Sans', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Roboto', 'Arial', 'sans-serif'],
        display: ['Open Sans', '-apple-system', 'Helvetica Neue', 'Arial', 'sans-serif'],
        marquee: ['Open Sans', '-apple-system', 'Helvetica Neue', 'Arial', 'sans-serif'],
        code: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        logo: ['Open Sans', '-apple-system', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      // The complete Cloudscape type scale — ten steps, each with its paired
      // line-height, nothing below 12px. Mirrors the --fs-* tokens in
      // globals.css so a class and a token can never disagree.
      fontSize: {
        'body-s': ['12px', '16px'],
        'body-m': ['14px', '20px'],
        'heading-xs': ['14px', '18px'],
        'heading-s': ['16px', '20px'],
        'heading-m': ['18px', '22px'],
        'heading-l': ['20px', '24px'],
        'heading-xl': ['24px', '30px'],
        'display-l': ['42px', '48px'],
        'display-xl': ['64px', '72px'],
      },
      // AWS uses radius per component role rather than one global value.
      borderRadius: {
        badge: '4px', input: '8px', item: '8px', dropdown: '8px',
        alert: '12px', container: '16px', card: '16px', button: '20px',
      },
      colors: {
        accent: {
          DEFAULT: BLUE[500],
          hover: BLUE[800],
          subtle: 'rgba(0,108,224,0.10)',
          muted: 'rgba(0,108,224,0.18)',
        },
        // Was navy — AWS marks success in green, which is also just correct.
        success: {
          DEFAULT: '#00802f',
          subtle: 'rgba(0,128,47,0.10)',
          muted: 'rgba(0,128,47,0.18)',
        },
        warning: {
          DEFAULT: '#855900',
          subtle: 'rgba(133,89,0,0.10)',
          muted: 'rgba(133,89,0,0.18)',
        },
        danger: {
          DEFAULT: '#db0000',
          subtle: 'rgba(219,0,0,0.10)',
          muted: 'rgba(219,0,0,0.18)',
        },
        surface: {
          DEFAULT: '#ffffff',
          elevated: GREY[50],
        },
        // Neutral ramp for low-contrast chrome (borders, dividers).
        frost: GREY,
        camora: {
          primary: BLUE[500],
          primaryLt: BLUE[400],
          primaryDk: BLUE[800],

          // The gold-leaf names are kept so call sites resolve; the value is
          // now AWS marketing orange, the one non-blue accent AWS actually has.
          goldLeaf: ORANGE[400],
          goldLeafLt: ORANGE[300],
          goldLeafDk: ORANGE[500],
          goldLeaf50: ORANGE[50],

          // copper / teal were already aliases of gold. Left as aliases.
          copper: ORANGE[400],
          copperLt: ORANGE[300],
          copperDk: ORANGE[500],
          copper50: ORANGE[50],
          teal: ORANGE[400],
          tealLt: ORANGE[300],
          tealDk: ORANGE[500],
          teal50: ORANGE[50],

          amber: ORANGE[500],
          amberLt: ORANGE[400],
          amberDk: ORANGE[600],
          amberMist: ORANGE[50],

          cream: GREY[50],
          creamLt: '#ffffff',

          warmInk: GREY[900],
          warmInkMid: GREY[700],
          warmInkLt: GREY[400],

          void: GREY[900],
          plumVoid: GREY[900],

          midnight: GREY[900],
          steel: GREY[600],
          mist: GREY[100],
          surface: '#ffffff',

          navy: BLUE,
          gold: ORANGE,
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
