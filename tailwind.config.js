/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "420px",
      },
      colors: {
        primary: "#1e40af",
        accent: "#0ea5e9",
        success: "#16a34a",
        danger: "#dc2626",
        warning: "#f59e0b",
      },
    },
  },
  plugins: [],
};
