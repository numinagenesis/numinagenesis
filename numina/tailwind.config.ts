import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:        "#000000",
        card:      "#080808",
        border:    "#222222",
        primary:   "#FFFFFF",
        secondary: "#AAAAAA",
        accent:    "#FFFFFF",
        soul:      "#AAAAAA",
        legendary: "#FFFFFF",
        green:     "#FFFFFF",
        red:       "#FFFFFF",
        muted:     "#666666",
        dim:       "#444444",
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        mono:  ['"Courier New"', "Courier", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
