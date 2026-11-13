module.exports = {
  purge: {
    content: [
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
    ],
    options: {
      safelist: {
        greedy: [/red|green/],
      },
    },
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        discord: { dark: "#313338" },
      },
    },
  },
  variants: {
    extend: {
      opacity: ["disabled"],
    },
  },
  plugins: [],
};
