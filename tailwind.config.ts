import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#C4A35A",
          dark: "#A68B48",
          light: "#D4B86A",
        },
        secondary: {
          DEFAULT: "#6B1C23",
          dark: "#4A1318",
          light: "#8C2530",
        },
        tertiary: {
          DEFAULT: "#1E4D6B",
          dark: "#163A51",
          light: "#2A6A94",
        },
        background: {
          DEFAULT: "#1A1714",
          light: "#2D241E",
        },
        surface: {
          DEFAULT: "#2D241E",
          light: "#3D3428",
        },
        parchment: {
          DEFAULT: "#F4E4BC",
          dark: "#E4D4AC",
        },
        ember: "#CF6679",
        forest: "#4CAF50",
        amber: "#FFC107",
      },
      fontFamily: {
        medieval: ["Cinzel", "serif"],
        narrative: ["Crimson Text", "serif"],
        ui: ["Open Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
