/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        nevoa: '#EAEFE8', // page background
        folha: '#F6F8F4', // inputs / raised surfaces
        tinta: '#16241C', // text and primary button
        musgo: '#255A41', // balance band
        sol: '#FFBE1F', // reward, mascot, "earn" actions
        pimenta: '#D6392B', // blocked / errors
        fio: '#C5D0C6', // hairlines
      },
      fontFamily: {
        display: ['BricolageGrotesque_800ExtraBold'],
        'display-bold': ['BricolageGrotesque_700Bold'],
        body: ['InstrumentSans_400Regular'],
        'body-semibold': ['InstrumentSans_600SemiBold'],
      },
    },
  },
  plugins: [],
};
