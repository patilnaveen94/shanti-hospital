/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Trustworthy medical blue — primary action + brand surface colour */
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36acf7',
          500: '#0c92e8',
          600: '#0074c6',
          700: '#015da0',
          800: '#064f84',
          900: '#0b426d',
          950: '#072948',
        },
        /* Soft mint green — success, wellness, availability */
        mint: {
          50: '#f0fdf6',
          100: '#dcfce9',
          200: '#bbf7d4',
          300: '#86efb6',
          400: '#4ade90',
          500: '#22c56f',
          600: '#16a359',
          700: '#158049',
          800: '#16653d',
          900: '#145334',
          950: '#052e19',
        },
        /* Authentic Shanti Hospital logo maroon — used as a heritage accent */
        heritage: {
          50: '#fdf4f4',
          100: '#fbe8e9',
          200: '#f6d4d6',
          300: '#eeb0b4',
          400: '#e2828b',
          500: '#d05664',
          600: '#ba384c',
          700: '#9c2a3d',
          800: '#822637',
          900: '#6b1f28',
          950: '#3d1016',
        },
        /* Emergency / critical alerts */
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 4px 16px -2px rgb(16 24 40 / 0.06)',
        'card-hover': '0 4px 8px -2px rgb(16 24 40 / 0.06), 0 16px 32px -8px rgb(16 24 40 / 0.14)',
        sheet: '0 -8px 32px -8px rgb(16 24 40 / 0.18)',
        nav: '0 -1px 0 0 rgb(16 24 40 / 0.06), 0 -8px 24px -12px rgb(16 24 40 / 0.14)',
        glow: '0 0 0 4px rgb(12 146 232 / 0.14)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      /* 18px sits between Tailwind's 4 (16px) and 5 (20px) — used for icons
         inside 44px touch targets where 16px reads slightly small. */
      spacing: {
        4.5: '1.125rem',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(.96) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(-16px) scale(.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(.9)', opacity: '.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
      },
      animation: {
        marquee: 'marquee 32s linear infinite',
        'fade-in-up': 'fade-in-up .5s cubic-bezier(.16,1,.3,1) both',
        'fade-in': 'fade-in .35s ease-out both',
        'scale-in': 'scale-in .28s cubic-bezier(.16,1,.3,1) both',
        'sheet-up': 'sheet-up .34s cubic-bezier(.16,1,.3,1) both',
        'slide-in-right': 'slide-in-right .3s cubic-bezier(.16,1,.3,1) both',
        'toast-in': 'toast-in .3s cubic-bezier(.16,1,.3,1) both',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(.24,.4,.36,1) infinite',
        shimmer: 'shimmer 1.6s infinite',
        'bounce-subtle': 'bounce-subtle 2.4s ease-in-out infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.16,1,.3,1)',
      },
    },
  },
  plugins: [],
};
