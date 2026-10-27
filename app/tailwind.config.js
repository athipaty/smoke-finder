/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        go: { DEFAULT: '#1f8a4c', dark: '#3fb872' },
        maybe: { DEFAULT: '#b7791f', dark: '#e0a33a' },
        stop: { DEFAULT: '#c0392b', dark: '#e5604f' },
      },
    },
  },
  plugins: [],
}
