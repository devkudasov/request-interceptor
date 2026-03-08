import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
        },
        surface: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          card: 'var(--color-bg-card)',
        },
        content: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
        },
        status: {
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          error: 'var(--color-error)',
          info: 'var(--color-info)',
        },
        method: {
          get: '#10B981',
          post: '#3B82F6',
          put: '#F59E0B',
          delete: '#EF4444',
          patch: '#8B5CF6',
        },
        size: {
          excellent: '#10B981',
          good: '#F59E0B',
          acceptable: '#F97316',
          poor: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['10px', { lineHeight: '14px' }],
        'sm': ['11px', { lineHeight: '16px' }],
        'base': ['13px', { lineHeight: '20px' }],
        'lg': ['14px', { lineHeight: '20px' }],
        'xl': ['16px', { lineHeight: '24px' }],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
      },
    },
  },
  plugins: [],
};

export default config;
