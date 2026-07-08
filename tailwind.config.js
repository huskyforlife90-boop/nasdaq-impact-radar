/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07090F",
          900: "#0B0E15",
          850: "#0F131C",
          800: "#131826",
          700: "#1B2233",
          600: "#273047",
          line: "#1E2536"
        },
        txt: {
          hi: "#E8ECF4",
          mid: "#9AA5BC",
          low: "#5C6785"
        },
        bull: "#2FD387",
        bear: "#F2555A",
        sevYellow: "#E8C547",
        sevOrange: "#F08C3C",
        sevRed: "#EF4351",
        accent: "#59B7FF"
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["IBM Plex Mono", "SFMono-Regular", "Menlo", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};
