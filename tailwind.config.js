/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#EAB308', // Kuning Modern (Yellow-500)
        primaryHover: '#CA8A04', // Kuning Gelap
        dark: '#111827', // Hitam Elegan (Gray-900)
        darker: '#030712', // Hitam Pekat (Gray-950)
        glass: 'rgba(17, 24, 39, 0.7)', // Dark Glassmorphism
      }
    },
  },
  plugins: [],
}