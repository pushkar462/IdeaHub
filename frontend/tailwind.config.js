/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{tsx,ts,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  'hsl(230,80%,97%)',
          100: 'hsl(230,80%,93%)',
          200: 'hsl(230,75%,85%)',
          300: 'hsl(230,70%,72%)',
          400: 'hsl(230,65%,60%)',
          500: 'hsl(230,60%,50%)',
          600: 'hsl(230,65%,42%)',
          700: 'hsl(230,70%,34%)',
          800: 'hsl(230,75%,26%)',
          900: 'hsl(230,80%,18%)',
        },
        surface: {
          DEFAULT: 'hsl(220,20%,97%)',
          hover:   'hsl(220,20%,93%)',
          border:  'hsl(220,15%,88%)',
        },
        dark: {
          bg:      'hsl(225,25%,10%)',
          card:    'hsl(225,20%,14%)',
          border:  'hsl(225,20%,22%)',
          muted:   'hsl(225,15%,50%)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        modal: '0 8px 40px rgba(0,0,0,0.18)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
