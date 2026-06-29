import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        void: "#070912",
        panel: "#101523",
        line: "#273044",
        ember: "#ff7a3d",
        mana: "#57d3ff",
        toxic: "#95f26d"
      },
      boxShadow: {
        glow: "0 0 40px rgba(87, 211, 255, 0.16)"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};

export default config;
