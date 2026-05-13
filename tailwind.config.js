/** @type {import('tailwindcss').Config} */
export default {
  // Le dice a Tailwind en qué archivos buscar las clases
  // para no generar CSS que no se usa
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}