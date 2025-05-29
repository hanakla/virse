import { rgba } from 'polished';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    dropShadow: {
      default: `0 0 4px ${rgba('#000', 0.4)}`,
      dark: `0 0 4px ${rgba('#000', 0.8)}`,
    },
    extend: {},
  },
  plugins: [],
};
