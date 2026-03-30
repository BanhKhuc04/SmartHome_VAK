/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: '#F6F7FB',
          glass: 'rgba(255, 255, 255, 0.75)',
          primary: '#3B82F6',
          secondary: '#8B5CF6',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          slate: {
            50: '#F8FAFC',
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E0',
            400: '#94A3B8',
            500: '#64748B',
            600: '#475569',
            700: '#334155',
            800: '#1E293B',
            900: '#0F172A',
          }
        }
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      backdropBlur: {
        'nexus': '20px',
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
}
