import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
      colors: {
        bg: {
          DEFAULT: "hsl(0 0% 98%)",
          subtle: "hsl(0 0% 96%)"
        },
        fg: {
          DEFAULT: "hsl(222 47% 11%)",
          muted: "hsl(215 16% 47%)"
        },
        card: "hsl(0 0% 100%)",
        border: "hsl(214 32% 91%)",
        primary: {
          DEFAULT: "#016B6B",
          hover: "#3F9EA2",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#3F9EA2",
          foreground: "#FFFFFF",
        },
        danger: "#EF4444",
        success: "#22C55E",
        warning: "#F59E0B",
        brand: {
          petrol: "#016B6B",
          turquoise: "#3F9EA2",
          darkgray: "#464747",
          bgLight: "#F8FAFA",
          white: "#FFFFFF",
        }
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)"
      }
    }
  },
  plugins: []
} satisfies Config
