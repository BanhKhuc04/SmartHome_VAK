/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        nexus: {
          bg: '#0a0e1a',
          surface: '#111827',
          card: '#1a2236',
          glass: 'rgba(26, 34, 54, 0.75)',
          border: 'rgba(255, 255, 255, 0.06)',
          primary: '#3B82F6',
          secondary: '#8B5CF6',
          cyan: '#06B6D4',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        }
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.15)',
        'premium': '0 8px 32px rgba(0, 0, 0, 0.25)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-green': '0 0 15px rgba(16, 185, 129, 0.25)',
      },
      backdropBlur: {
        'nexus': '24px',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
}
