import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'rgb(var(--surface) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        action: 'rgb(var(--action) / <alpha-value>)',
        slate: {
          50: 'rgb(var(--surface) / <alpha-value>)',
          100: 'rgb(var(--subtle) / <alpha-value>)',
          200: 'rgb(var(--border) / <alpha-value>)',
          400: 'rgb(var(--muted) / <alpha-value>)',
          500: 'rgb(var(--muted) / <alpha-value>)',
          600: 'rgb(var(--muted) / <alpha-value>)',
          700: 'rgb(var(--ink) / <alpha-value>)',
        },
        red: {
          50: 'rgb(var(--danger-bg) / <alpha-value>)',
          200: 'rgb(var(--danger-border) / <alpha-value>)',
          700: 'rgb(var(--danger) / <alpha-value>)',
          800: 'rgb(var(--danger) / <alpha-value>)',
        },
        amber: { 800: 'rgb(var(--warning) / <alpha-value>)' },
        emerald: { 700: 'rgb(var(--success) / <alpha-value>)' },
        brand: {
          50: 'rgb(var(--accent-bg) / <alpha-value>)',
          100: 'rgb(var(--accent-border) / <alpha-value>)',
          600: 'rgb(var(--accent) / <alpha-value>)',
          700: 'rgb(var(--accent) / <alpha-value>)',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
