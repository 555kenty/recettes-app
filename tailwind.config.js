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
          500: '#C2410C',
          600: '#9A3412',
          700: '#7C2D12',
        },
        canvas: {
          50:  '#FAFAF7',
          100: '#F2F1EC',
          200: '#E7E5E4',
        },
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:  '0 1px 3px rgb(0 0 0 / 0.06), 0 4px 12px rgb(0 0 0 / 0.04)',
        hover: '0 8px 30px rgb(0 0 0 / 0.10), 0 2px 8px rgb(0 0 0 / 0.06)',
        float: '0 20px 60px rgb(0 0 0 / 0.15)',
      },
    },
  },
  plugins: [],
}
