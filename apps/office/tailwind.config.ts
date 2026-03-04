import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        // GBA-inspired palette
        'gba-white': '#f8f8f8',
        'gba-black': '#101010',
        'gba-green': '#306230',
        'gba-light-green': '#8bac0f',
        'gba-dark': '#1e1e1e',
        'gba-brown': '#7c5a3c',
        'gba-beige': '#e8d8a0',
      },
    },
  },
  plugins: [],
}

export default config
