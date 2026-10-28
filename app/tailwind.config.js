/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      // Light-mode values meet WCAG AA (4.5:1) as text on the page and card
      // backgrounds and under white text; checked with axe in light and dark.
      colors: {
        go: { DEFAULT: '#1b7d44', dark: '#3fb872' },
        maybe: { DEFAULT: '#94600f', dark: '#e0a33a' },
        stone: { 500: '#716a65' }, // Tailwind's #78716c is 4.4:1 on stone-100
        stop: { DEFAULT: '#c0392b', dark: '#e5604f' },
      },
    },
  },
  plugins: [],
}
