/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#0a0b0d',
          900: '#111215',
          850: '#15171c',
          800: '#1a1c23',
          750: '#20232b',
          700: '#272b35',
          600: '#333846',
          500: '#484f63',
          400: '#6f7a95',
          300: '#9ea9c3',
          200: '#d0d7e7',
          100: '#f1f4fa'
        },
        accent: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          amber: '#f59e0b',
          emerald: '#10b981',
          rose: '#f43f5e',
          purple: '#8b5cf6'
        }
      }
    },
  },
  plugins: [],
}
