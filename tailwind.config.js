/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          50: '#fff0f0',
          100: '#ffe1e1',
          500: '#FF6B6B',
          600: '#ee5a5a',
        },
        cream: {
          50: '#FFFBF5',
          100: '#FFF5E1',
        },
        mint: {
          500: '#4ECDC4',
        },
        charcoal: {
          800: '#2C3E50',
          900: '#1a252f',
        },
      },
    },
  },
  plugins: [],
}
