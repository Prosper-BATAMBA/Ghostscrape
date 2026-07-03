/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#0f0f11',
          50: '#f8f8f9',
          100: '#e8e8ed',
          200: '#c9c9d4',
          300: '#a4a4b5',
          400: '#7c7c8f',
          500: '#5c5c6e',
          600: '#3e3e4e',
          700: '#2a2a36',
          800: '#1a1a23',
          900: '#0f0f11',
        },
        accent: {
          DEFAULT: '#6c8cff',
          50: '#f0f3ff',
          100: '#dce3ff',
          200: '#b8c7ff',
          300: '#8ca6ff',
          400: '#6c8cff',
          500: '#4a6cf7',
          600: '#3a56d4',
          700: '#2f44a8',
          800: '#273885',
          900: '#1b2a66',
        },
      },
    },
  },
  plugins: [],
}
