/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        nevoa: 'rgb(var(--c-nevoa) / <alpha-value>)', // page background (warm cream)
        folha: 'rgb(var(--c-folha) / <alpha-value>)', // cards / inputs
        tinta: 'rgb(var(--c-tinta) / <alpha-value>)', // text and primary button (deep green)
        musgo: 'rgb(var(--c-musgo) / <alpha-value>)', // hero green
        floresta: 'rgb(var(--c-floresta) / <alpha-value>)', // lighter green for gradients
        sol: 'rgb(var(--c-sol) / <alpha-value>)', // reward / "earn" actions
        pimenta: 'rgb(var(--c-pimenta) / <alpha-value>)', // blocked / errors
        fio: 'rgb(var(--c-fio) / <alpha-value>)', // hairlines
        sage: 'rgb(var(--c-sage) / <alpha-value>)', // info boxes
        crema: 'rgb(var(--c-crema) / <alpha-value>)', // soft yellow highlight
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
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
