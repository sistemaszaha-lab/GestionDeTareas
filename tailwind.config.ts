import type { Config } from "tailwindcss"

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
        primary: "hsl(221 83% 53%)",
        danger: "hsl(0 84% 60%)"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)"
      }
    }
  },
  plugins: []
} satisfies Config

