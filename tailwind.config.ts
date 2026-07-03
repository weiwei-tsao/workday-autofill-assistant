import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F4F1',
        surface: '#FFFFFF',
        raised: '#FDFCFB',
        ink: '#1C1A17',
        body: '#45413B',
        muted: '#6E6961',
        faint: '#9B958C',
        line: '#EAE6E0',
        'line-strong': '#DDD8D0',
        hairline: '#F1EEE9',
        primary: '#6C55C8',
        teal: '#2AA79B',
        amber: '#E4B33C',
        success: '#1E8E5A',
        warning: '#B98900',
        danger: '#C4453C',
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '14px',
        panel: '20px',
        input: '10px',
        badge: '6px',
      },
    },
  },
  plugins: [],
} satisfies Config
