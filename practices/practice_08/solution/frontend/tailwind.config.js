/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { ink: '#070b11', panel: '#0d131c', line: '#1b2635', lime: '#b8f43d', muted: '#8b98aa' },
    fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
    boxShadow: { glow: '0 0 40px rgba(184,244,61,.08)' },
  } },
  plugins: [daisyui],
  daisyui: {
    themes: [{
      nova: {
        primary: '#b8f43d',
        'primary-content': '#070b11',
        secondary: '#38bdf8',
        'secondary-content': '#070b11',
        accent: '#34d399',
        neutral: '#1b2635',
        'neutral-content': '#f4f7fa',
        'base-100': '#070b11',
        'base-200': '#0d131c',
        'base-300': '#1b2635',
        'base-content': '#f4f7fa',
        info: '#38bdf8',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#fb7185',
      },
    }],
  },
};
