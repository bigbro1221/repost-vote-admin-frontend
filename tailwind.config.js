/** @type {import('tailwindcss').Config} */

const config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          yellow: '#FFD12F',
          'yellow-hover': '#F7C400',
          blue: '#02A0FC',
          green: '#00B05C',
          red: '#EF3131',
          navy: '#02124D',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(24,24,27,.04), 0 1px 3px rgba(24,24,27,.06)',
        card: '0 1px 2px rgba(24,24,27,.04), 0 4px 16px -4px rgba(24,24,27,.08)',
        pop: '0 12px 40px -8px rgba(24,24,27,.25), 0 2px 6px rgba(24,24,27,.08)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'scale-in': { from: { opacity: 0, transform: 'translateY(6px) scale(.97)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        'toast-in': { from: { opacity: 0, transform: 'translateY(-12px) scale(.96)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        shake: { '0%,100%': { transform: 'none' }, '25%': { transform: 'translateX(-4px)' }, '75%': { transform: 'translateX(4px)' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'scale-in': 'scale-in .2s cubic-bezier(.16,1,.3,1)',
        'slide-in-right': 'slide-in-right .28s cubic-bezier(.16,1,.3,1)',
        'slide-in-left': 'slide-in-left .24s cubic-bezier(.16,1,.3,1)',
        'toast-in': 'toast-in .24s cubic-bezier(.16,1,.3,1)',
        shimmer: 'shimmer 1.6s linear infinite',
        shake: 'shake .25s ease-in-out 2',
      },
    },
  },
  plugins: [],
}
export default config
