/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx,html}",
    "./src/renderer/index.html",
  ],
  theme: {
    extend: {
      colors: {
        // الألوان من النظام الحالي - Enhanced Arabic Colors
        primary: {
          DEFAULT: '#6988e6',
          50: '#f0f4ff',
          100: '#e6efff',
          200: '#c3d4ff',
          300: '#a0b9ff',
          400: '#899eff',
          500: '#6988e6',
          600: '#4f6dd5',
          700: '#3f5ac4',
          800: '#334a9e',
          900: '#2a3d7c',
        },
        secondary: {
          DEFAULT: '#e69e88',
          50: '#fdf6f3',
          100: '#fbe9e0',
          200: '#f6cbb8',
          300: '#f1ad90',
          400: '#eb9577',
          500: '#e69e88',
          600: '#d17c5c',
          700: '#b8633f',
          800: '#9e4f2a',
          900: '#7d3f21',
        },
        background: {
          DEFAULT: '#1b1b1f',
          soft: '#222222',
          mute: '#282828',
        },
        text: {
          DEFAULT: 'rgba(255, 255, 245, 0.86)',
          secondary: 'rgba(235, 235, 245, 0.6)',
          muted: 'rgba(235, 235, 245, 0.38)',
        },
        gray: {
          1: '#515c67',
          2: '#414853',
          3: '#32363f',
        },
        white: {
          DEFAULT: '#ffffff',
          soft: '#f8f8f8',
          mute: '#f2f2f2',
        },
        // CASNOS Status Colors
        success: {
          DEFAULT: '#4caf50',
          light: '#81c784',
          dark: '#388e3c',
        },
        warning: {
          DEFAULT: '#ff9800',
          light: '#ffb74d',
          dark: '#f57c00',
        },
        error: {
          DEFAULT: '#f44336',
          light: '#e57373',
          dark: '#d32f2f',
        },
        info: {
          DEFAULT: '#2196f3',
          light: '#64b5f6',
          dark: '#1976d2',
        }
      },
      fontFamily: {
        'mono': [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace'
        ],
        'arabic': ['Tajawal', 'Arial', 'sans-serif'],
        'sans': ['Tajawal', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'bounce-soft': 'bounceSoft 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.05)',
        'hard': '0 10px 40px -10px rgba(0, 0, 0, 0.2), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}

