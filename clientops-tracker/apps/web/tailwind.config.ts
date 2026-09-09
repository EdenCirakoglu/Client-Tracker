import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f6f8fb',
        ink: '#172033',
        muted: '#52627a',
        border: '#d9e1ec',
        brand: {
          50: '#eef8f7',
          100: '#d6eeeb',
          600: '#1d6f65',
          700: '#175b53',
        },
      },
      boxShadow: {
        soft: '0 18px 45px rgba(23, 32, 51, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
