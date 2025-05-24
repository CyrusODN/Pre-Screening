/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      colors: {
        'remedy-blue': '#4A90B9',
        'remedy-teal': '#5BA6B6', 
        'remedy-mint': '#68BFB3',
        'remedy-accent': '#46B7C6',
        'remedy-accent-hover': '#3A8A9E',
      },
      backgroundImage: {
        'gradient-theme': 'linear-gradient(135deg, #4A90B9 0%, #5BA6B6 50%, #68BFB3 100%)',
        'gradient-theme-light': 'linear-gradient(135deg, rgba(74, 144, 185, 0.05) 0%, rgba(104, 191, 179, 0.05) 100%)',
      },
      scale: {
        '102': '1.02',
      }
    },
  },
  plugins: [],
};