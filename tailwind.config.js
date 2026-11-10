/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          950: '#030712',
          900: '#070b19',
          850: '#0c1326',
          800: '#111b33',
          700: '#1b294b',
          600: '#2b3e6b'
        },
        lunar: {
          surface: '#1c1f26',
          highlight: '#3f4552',
          crater: '#14161b',
          rim: '#848d9a'
        },
        telemetry: {
          gold: '#f59e0b',
          solar: '#facc15',
          earth: '#38bdf8',
          los: '#22c55e',
          shadow: '#ef4444',
          blackout: '#f43f5e',
          cyan: '#06b6d4'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
