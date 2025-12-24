/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#121212',
                surface: '#1e1e1e',
                primary: '#bb86fc',
                secondary: '#03dac6'
            }
        },
    },
    plugins: [],
}
