// All user-facing text (pt-BR). Keep keys stable so other locales can be added later.
export const strings = {
  app: {
    name: 'Unscroll',
    tagline: 'Ganhe tempo de tela fazendo o que importa.',
  },
  home: {
    title: 'Início',
    scaffoldNotice: 'Scaffold da Fase 1 pronto. As telas reais chegam na Fase 5.',
  },
} as const;

export type Strings = typeof strings;
