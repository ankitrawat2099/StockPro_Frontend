/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f8",
          100: "#e8ebee",
          200: "#cfd7de",
          300: "#a9b7c5",
          400: "#76899d",
          500: "#56677a",
          600: "#405062",
          700: "#313d4c",
          800: "#222d3a",
          900: "#141d29",
          950: "#0b1119"
        },
        cream: "#f3efe7",
        coral: "#d96c4d",
        mint: "#8ac7b8",
        gold: "#e4b363"
      },
      boxShadow: {
        panel: "0 24px 60px rgba(8, 15, 22, 0.18)"
      },
      fontFamily: {
        display: ["Space Grotesk", "Segoe UI", "sans-serif"],
        body: ["IBM Plex Sans", "Segoe UI", "sans-serif"]
      }
    },
  },
  plugins: [],
};
