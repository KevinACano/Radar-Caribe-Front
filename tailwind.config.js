/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        radar: {
          dark: '#07151D',
          glass: 'rgba(11, 59, 64, 0.82)',
          glassBorder: 'rgba(45, 212, 191, 0.25)',
          teal: '#2DD4BF',
          deepTeal: '#0B3B40',
        },
        ocean: {
          900: '#07151D',
          800: '#0B3B40',
          700: '#0F5247',
          600: '#13695B',
          500: '#14B8A6',
        },
        turquoise: {
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'floating': '0 12px 40px rgba(0, 0, 0, 0.55)',
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
