/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0070f3",
          50: "#f0f7ff",
          100: "#e0f0ff",
          200: "#b9ddff",
          300: "#7cc3ff",
          400: "#3aa0ff",
          500: "#0070f3",
          600: "#005cda",
          700: "#0047b1",
          800: "#003c91",
          900: "#003577",
        },
      },
    },
  },
  plugins: [],
}

