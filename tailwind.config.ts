import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a0f1e',
          900: '#0d1527',
          800: '#111d38',
          700: '#1a2744',
          600: '#243356',
          500: '#2e4068',
        },
        electric: {
          700: '#1557cc',
          600: '#1d6fe8',
          500: '#2979ff',
          400: '#60a5fa',
          300: '#93c5fd',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'navy': '0 4px 24px rgba(10, 15, 30, 0.8)',
        'electric': '0 0 20px rgba(41, 121, 255, 0.3)',
        'glow': '0 0 40px rgba(41, 121, 255, 0.15)',
      },
      borderColor: {
        DEFAULT: '#1a2744',
      },
    },
  },
  plugins: [],
}

export default config
