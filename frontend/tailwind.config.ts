import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#ad2bee",
        "background-light": "#f7f6f8",
        "background-dark": "#1c1022",
        "surface-dark": "#2a1b32",
        "surface-light": "#ffffff",
      },
      fontFamily: {
        display: ["'Be Vietnam Pro'", "'Noto Sans KR'", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "2rem",
        xl: "3rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
export default config;
