/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                iq: {
                    dark: '#18191A',
                    surface: '#242526',
                    hover: '#3A3B3C',
                    divider: '#3E4042',
                    blue: '#1877F2',
                    primary: '#E4E6EB',
                    secondary: '#B0B3B8'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            gridTemplateColumns: {
                '13': 'repeat(13, minmax(0, 1fr))',
            },
            gridTemplateRows: {
                '13': 'repeat(13, minmax(0, 1fr))',
            }
        },
    },
    plugins: [],
}
