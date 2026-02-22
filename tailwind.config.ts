import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0C0C0C",
        foreground: "#F3F3F3",
        bronze: "#C6A25B",
        bronzeDim: "#a88a4b"
      },
      boxShadow: {
        soft: "0 6px 30px rgba(0,0,0,0.25)"
      }
    }
  },
  plugins: []
} satisfies Config;
