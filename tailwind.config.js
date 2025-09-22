module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f766e',
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b'
        },
        cool: {
          50: '#f6fbfa',
          100: '#eef8f6',
          200: '#dff3ee',
          300: '#c7ece0',
          400: '#95e0cc',
          500: '#66d4b8',
          600: '#3db99f',
          700: '#2a8a6f',
          800: '#1f6a56',
          900: '#174a3e'
        }
      },
      boxShadow: {
        soft: '0 8px 30px rgba(6, 30, 24, 0.08)'
      },
      borderRadius: {
        xl: '1rem'
      }
    }
  },
  plugins: []
}
