/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(0)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          from: {transform: 'rotate(360deg)'},
          to: {transform: 'rotate(0deg)'},
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}