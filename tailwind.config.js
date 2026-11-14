/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        nevoa: '#F7F4E9', // page background (warm cream)
        folha: '#FFFFFF', // cards / inputs
        tinta: '#16372A', // text and primary button (deep green)
        musgo: '#12452E', // hero green
        floresta: '#1F6B43', // lighter green for gradients
        sol: '#FFC72C', // reward / "earn" actions
        pimenta: '#D6392B', // blocked / errors
        fio: '#E5E0CC', // hairlines
      },
      fontFamily: {
        display: ['Nunito_900Black'],
        'display-bold': ['Nunito_800ExtraBold'],
        body: ['Nunito_400Regular'],
        'body-semibold': ['Nunito_700Bold'],
      },
    },
  },
  plugins: [],
};
