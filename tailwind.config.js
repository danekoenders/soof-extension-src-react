/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'roboto': ['Roboto', 'sans-serif'],
      },
      maxWidth: {
        'sm': '400px', // Kapa.ai style max width
      },
      height: {
        '3/5': '60%', // Kapa.ai modal height
      },
      minHeight: {
        '96': '24rem', // 384px
      },
      borderRadius: {
        '2xl': '16px',
      },
      animation: {
        'pulse': 'pulse 1.4s infinite both',
      },
      keyframes: {
        pulse: {
          '0%': { opacity: '0.2' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0.2' },
        }
      },
      animationDelay: {
        '200': '0.2s',
        '400': '0.4s', 
        '600': '0.6s',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
