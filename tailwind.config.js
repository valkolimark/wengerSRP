/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0B1E3F',
        'navy-deep': '#060F22',
        magenta: '#FF2D75',
        'magenta-glow': '#FF5A95',
        cyan: '#00E5FF',
        'cyan-soft': '#7CF1FF',
        gold: '#FFD230',
        'gold-soft': '#FFE680',
        success: '#00E676',
        warning: '#FFB300',
        danger: '#FF3D3D',
      },
      fontFamily: {
        display: ['"Bebas Neue"', '"Anton"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-magenta': '0 0 24px rgba(255, 45, 117, 0.55)',
        'glow-cyan': '0 0 24px rgba(0, 229, 255, 0.55)',
        'glow-gold': '0 0 28px rgba(255, 210, 48, 0.65)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        timerPulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.55 },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
        timerPulse: 'timerPulse 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
