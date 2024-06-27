/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./view/**/*.{html,js,mustache}'],
  fontFamily: {
    sans: ['IBM Plex Sans', 'system-ui'],
    mono: ['IBM Plex Mono', 'monospace'],
    display: ['IBM Plex Sans'],
    body: ['IBM Plex Sans'],
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
