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
      backgroundImage: {
        'dark-wood': "url('/textures/dark-wood-bg.jpg')",
        'parchment': "url('/textures/parchment.jpg')",
        'leather': "url('/textures/leather.jpg')",
        'stone': "url('/textures/stone.jpg')",
        'btn-primary': "url('/ui/button-primary.png')",
        'btn-secondary': "url('/ui/button-secondary.png')",
        'card-bg': "url('/ui/card-bg.png')",
        'input-bg': "url('/ui/input-bg.png')",
        'frame-large': "url('/frames/gold-frame-large.png')",
        'frame-medium': "url('/frames/gold-frame-medium.png')",
        'frame-small': "url('/frames/gold-frame-small.png')",
        'scroll': "url('/frames/scroll-frame.png')",
      },
    },
  },
  plugins: [],
};

export default config;
