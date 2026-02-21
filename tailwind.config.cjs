/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './**/*.{html,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // Preline UI is now imported via CSS in index.css
    // require('preline/plugin')
  ],
}
