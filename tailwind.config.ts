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
        terracotta: {
          DEFAULT: '#c65d3b',
          light: '#e07a55',
          dark: '#a84a2d',
        },
        cream: {
          DEFAULT: '#f5f0e8',
          dark: '#e8e0d4',
          light: '#faf8f4',
          50: '#FFFBF5',
          100: '#FFF5E1',
        },
        olive: {
          DEFAULT: '#6b7c5e',
          light: '#8a9a7d',
          dark: '#526145',
        },
        mustard: {
          DEFAULT: '#d4a843',
          light: '#e4be6a',
          dark: '#b8922f',
        },
        charcoal: {
          DEFAULT: '#2d2a26',
          800: '#2C3E50',
          900: '#1a252f',
        },
        stone: '#8b8680',
        coral: {
          50: '#fff0f0',
          100: '#ffe1e1',
          500: '#FF6B6B',
          600: '#ee5a5a',
        },
        mint: {
          500: '#4ECDC4',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.6s ease-out forwards',
        'scale-in': 'scale-in 0.4s ease-out forwards',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
      },
      borderRadius: {
        'organic': '2rem 1rem 2.5rem 1.5rem',
        'organic-lg': '3rem 2rem 3.5rem 2.5rem',
      },
      boxShadow: {
        'organic': '0 4px 20px rgba(198, 93, 59, 0.15)',
        'organic-lg': '0 8px 40px rgba(198, 93, 59, 0.2)',
        'soft': '0 2px 4px rgba(0,0,0,0.02), 0 8px 16px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
