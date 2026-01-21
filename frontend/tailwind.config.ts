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
        "background-dark": "#010101", // 배경색
        "surface-dark": "#1C191E",
        "surface-light": "#ffffff",
        "surface-border": "#302437",
        "surface-text": "#8A8F9C",
      },
      fontFamily: {
        display: ["'Be Vietnam Pro'", "'Noto Sans KR'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
