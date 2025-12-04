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
        // === 16-BIT JRPG PALETTE ===

        // The Void - Deep background behind UI
        void: {
          DEFAULT: "#1a0b1c",
          light: "#2a1d17",
        },

        // Parchment - Main content backgrounds
        parchment: {
          DEFAULT: "#e8dcca",
          dim: "#d4c6b0",
          dark: "#c4b69a",
        },

        // Ink - Text colors
        ink: {
          DEFAULT: "#2a1d17",
          light: "#4a3d37",
        },

        // Gold - Borders and highlights (SNES bevel)
        gold: {
          light: "#fadd92",   // Top/Left border
          base: "#c69c48",    // Mid-tone
          shadow: "#7a5923",  // Bottom/Right border
          dark: "#5a4313",    // Darkest
        },

        // Gem Colors - Buttons and accents
        gem: {
          red: "#e63e3e",     // HP / Danger / Close
          blue: "#3e8ee6",    // MP / Links / Info  
          green: "#45b052",   // Stamina / Success
          purple: "#8e5cc8",  // XP / Magic
        },

        // === LEGACY COLORS (compatibility) ===
        primary: {
          DEFAULT: "#c69c48",
          dark: "#7a5923",
          light: "#fadd92",
        },
        secondary: {
          DEFAULT: "#e63e3e",
          dark: "#b82e2e",
          light: "#f05858",
        },
        background: "#1a0b1c",
        surface: "#2a1d17",
        foreground: "#e8dcca",
        ember: "#e63e3e",
        forest: "#45b052",
        amber: "#fadd92",
      },
      fontFamily: {
        // Pixel fonts for that authentic SNES feel
        pixel: ['"Press Start 2P"', 'monospace'],
        retro: ['"VT323"', 'monospace'],
        // Body text - slightly pixelated serif
        quest: ['"Pixelify Sans"', '"Courier Prime"', 'serif'],
        // Fallback medieval
        medieval: ['Cinzel', 'Georgia', 'serif'],
      },
      boxShadow: {
        // Hard drop shadows (no blur - pure pixel art style)
        'hard-sm': '2px 2px 0 #000',
        'hard-md': '3px 3px 0 #000',
        'hard-lg': '4px 4px 0 #000',
        // Pressed state
        'none': 'none',
        // RPG border inset
        'rpg-inset': 'inset 2px 2px 0 #c69c48, inset -2px -2px 0 #c69c48',
        // Gem shine
        'gem-shine': 'inset 2px 2px 0 rgba(255,255,255,0.4), inset -2px -2px 0 rgba(0,0,0,0.3)',
        // Golden glow effects
        'gold-glow-sm': '0 0 10px rgba(250, 221, 146, 0.3)',
        'gold-glow': '0 0 15px rgba(250, 221, 146, 0.4), 0 0 30px rgba(198, 156, 72, 0.2)',
        'gold-glow-lg': '0 0 20px rgba(250, 221, 146, 0.5), 0 0 40px rgba(198, 156, 72, 0.3), 0 0 60px rgba(198, 156, 72, 0.1)',
        // Magical purple glow
        'magic-glow': '0 0 15px rgba(142, 92, 200, 0.4), 0 0 30px rgba(142, 92, 200, 0.2)',
        // Panel shadows
        'panel': '4px 4px 0 rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)',
        'panel-inset': 'inset 3px 3px 0 rgba(0,0,0,0.4), inset -2px -2px 0 rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        // Dithered pattern for void background
        'dither': 'radial-gradient(#2a1d17 1px, transparent 1px)',
        // Paper grain noise
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        'dither-4': '4px 4px',
        'dither-2': '2px 2px',
      },
      animation: {
        'cursor-blink': 'blink 1s step-start infinite',
        'typewriter': 'typewriter 2s steps(40) forwards',
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'twinkle-delayed': 'twinkle 3s ease-in-out 1.5s infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shimmer-slow': 'shimmer 4s linear infinite',
        'drift': 'drift 20s linear infinite',
        'shooting-star': 'shooting-star 1.5s ease-out forwards',
        'ghost-ship-drift': 'ghost-ship-drift 60s linear forwards',
        'ghost-ship-fade': 'ghost-ship-fade 60s ease-in-out forwards',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        typewriter: {
          'from': { width: '0' },
          'to': { width: '100%' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(250, 221, 146, 0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(250, 221, 146, 0.6), 0 0 40px rgba(198, 156, 72, 0.3)' },
        },
        drift: {
          '0%': { transform: 'translateX(0) translateY(0)' },
          '100%': { transform: 'translateX(-50px) translateY(-30px)' },
        },
        'shooting-star': {
          '0%': { 
            transform: 'translateX(0) translateY(0) rotate(-45deg)', 
            opacity: '1',
            width: '4px',
          },
          '30%': {
            opacity: '1',
            width: '40px',
          },
          '100%': { 
            transform: 'translateX(200px) translateY(200px) rotate(-45deg)', 
            opacity: '0',
            width: '80px',
          },
        },
        'ghost-ship-drift': {
          '0%': { transform: 'translateX(100vw) translateY(0)' },
          '100%': { transform: 'translateX(-200px) translateY(-30px)' },
        },
        'ghost-ship-fade': {
          '0%': { opacity: '0' },
          '5%': { opacity: '0.15' },
          '50%': { opacity: '0.2' },
          '95%': { opacity: '0.1' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
