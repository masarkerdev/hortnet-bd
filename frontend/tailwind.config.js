/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // পুরো UI বাংলা-প্রধান, তাই Noto Sans Bengali মূল font।
        sans: ['"Noto Sans Bengali"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // horticulture-র সবুজ ramp — primary রং।
        brand: {
          50: '#eef6f0',
          100: '#d6e9db',
          200: '#aed3b8',
          300: '#7fb890',
          400: '#4f9c68',
          500: '#2f8f57',
          600: '#25794a',
          700: '#1f6340',
          800: '#1b4d33',
          900: '#15402b',
        },
        canvas: '#f4f6f1',   // নরম সবুজাভ off-white background
        ink: '#1c2b22',      // মূল লেখার রং (গাঢ় সবুজ-ধূসর)
        muted: '#5b6b62',    // হালকা লেখা
        line: '#e3e8e2',     // border
        harvest: '#d99c00',  // সতর্কতা/low-stock-এর জন্য (অল্প ব্যবহার)
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,43,34,0.04), 0 8px 24px -12px rgba(28,43,34,0.12)',
      },
    },
  },
  plugins: [],
};
