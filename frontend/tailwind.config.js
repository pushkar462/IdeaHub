/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{tsx,ts,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#8018de',
          light: '#ede3ff',
        },
        surface: {
          DEFAULT: '#ffffff',
          hover: '#f9fafb', // gray-50
          border: '#e5e7eb', // gray-200
          muted: '#737373', // brand gray
        },
        accent: {
          cyan: '#77f0ec',
          lime: '#e5f800',
          yellow: '#fec530',
          orange: '#f15d24',
          blue: '#0a6dd8',
          green: '#2ac25d',
        },
        neutral: {
          light: '#e2e2e2',
          DEFAULT: '#737373',
          dark: '#404040',
        }
      },
      fontFamily: {
        // Body copy — brand manual specifies Anek Devanagari.
        sans:    ['"Anek Devanagari"', 'system-ui', 'sans-serif'],
        // Headings — brand manual specifies Quattrocento (serif).
        heading: ['Quattrocento', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 10px 15px -3px rgba(128, 24, 222, 0.1), 0 4px 6px -2px rgba(128, 24, 222, 0.05)',
        glow: '0 0 20px rgba(128, 24, 222, 0.15)', // primary purple glow
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: { 
          '0%': { opacity: '0' }, 
          '100%': { opacity: '1' } 
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
