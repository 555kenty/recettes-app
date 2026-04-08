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
        brand: {
          50:  '#FFF5F0',
          100: '#FFE4D6',
          200: '#FFC5A8',
          500: '#C4583A',
          600: '#9B3E25',
          700: '#7C2D12',
        },
        canvas: {
          50:  '#FDF6EE',
          100: '#FFF8F0',
          200: '#F0E6DC',
        },
        olive: {
          100: '#EEF4E8',
          200: '#D5E8C4',
          500: '#5C7A3A',
          700: '#3D5427',
        },
        honey: {
          100: '#FBF3DC',
          200: '#F5E4A0',
          500: '#D4930D',
          700: '#A06C09',
        },
        night: '#1C1410',
        warm: {
          700: '#6B4226',
          900: '#2C1810',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:  '0 1px 3px rgba(44,24,16,0.06), 0 4px 12px rgba(44,24,16,0.04)',
        hover: '0 8px 30px rgba(44,24,16,0.12), 0 2px 8px rgba(44,24,16,0.06)',
        float: '0 20px 60px rgba(44,24,16,0.15)',
      },
    },
  },
  plugins: [],
}
