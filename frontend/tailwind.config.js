export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {
    colors: { ink: "#050607", carbon: "#101214", graphite: "#1A1D20", gold: "#D8B45A", paper: "#F4F1E9" },
    fontFamily: { sans: ["DM Sans", "Arial", "sans-serif"], display: ["Barlow Condensed", "Arial Narrow", "sans-serif"], mono: ["IBM Plex Mono", "monospace"] }
  }},
  plugins: []
};