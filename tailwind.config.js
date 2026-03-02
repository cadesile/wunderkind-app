/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        pitch: {
          green: '#2D6A4F',
          dark: '#1B4332',
        },
        academy: {
          gold: '#F4A261',
          blue: '#2196F3',
          light: '#E6F4FE',
        },
      },
    },
  },
  plugins: [],
};
