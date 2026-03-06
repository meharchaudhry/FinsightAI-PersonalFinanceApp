/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F5F5F2",
        foreground: "#1C1C1A",
        primary: {
          DEFAULT: "#2E3B2F",
          foreground: "#F0F2EF",
        },
        secondary: {
          DEFAULT: "#E6E4DD",
          foreground: "#2E3B2F",
        },
        accent: {
          DEFAULT: "#C45D40",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#E6E4DD",
          foreground: "#6B6960",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1C1C1A",
        },
        border: "#D0D9D0",
        input: "#E6E4DD",
        ring: "#2E3B2F",
        chart: {
          1: "#2E3B2F",
          2: "#C45D40",
          3: "#D4A373",
          4: "#8A9A5B",
          5: "#6B6960",
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Manrope', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
