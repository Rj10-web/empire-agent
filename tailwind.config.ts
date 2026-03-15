import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyan: {
          empire: '#00AEEF',
          dark: '#0088c4',
          glow: '#00AEEF33',
        },
        gold: {
          empire: '#FFD700',
          dark: '#ccac00',
          glow: '#FFD70033',
        },
        dark: {
          base: '#080810',
          surface: '#0f0f1a',
          elevated: '#16162a',
          border: '#1e1e38',
          muted: '#2a2a4a',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00AEEF33' },
          '100%': { boxShadow: '0 0 20px #00AEEF66, 0 0 40px #00AEEF22' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      fontFamily: {
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}

export default config
