/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Official Wenger Corporation palette
      colors: {
        // Primary
        navy: '#003658',
        'navy-deep': '#001f36',  // darker shade derived from Navy for backgrounds
        bou: '#69aebd',           // Bou — primary brand accent

        // Secondary
        leaf: '#87c440',
        cadet: '#00657e',
        pool: '#aedad6',
        'wenger-gray': '#bbbdc0', // 30% black
        'burnt-orange': '#cb6918',

        // Accents
        cyan: '#5fb1e2',          // Wenger Cyan
        green: '#006254',
        black: '#1e1e1e',
        'gray-75': '#626366',     // 75% black

        // Re-mapped semantic tokens (kept stable so existing class names still work)
        magenta: '#cb6918',         // Burnt Orange stands in for the old magenta accent
        'magenta-glow': '#e08537',  // softer burnt-orange glow
        'cyan-soft': '#aedad6',     // Pool
        gold: '#87c440',            // Leaf — the points/celebration color
        'gold-soft': '#aedad6',     // Pool tint for the count-up glow
        success: '#87c440',         // Leaf for hits
        warning: '#cb6918',         // Burnt Orange for warnings
        danger: '#cb6918',
      },
      fontFamily: {
        display: ['"Bebas Neue"', '"Anton"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-magenta': '0 0 24px rgba(203, 105, 24, 0.55)',  // Burnt Orange glow
        'glow-cyan': '0 0 24px rgba(95, 177, 226, 0.55)',     // Wenger Cyan glow
        'glow-gold': '0 0 28px rgba(135, 196, 64, 0.6)',      // Leaf glow
        'glow-bou': '0 0 24px rgba(105, 174, 189, 0.55)',
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
