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
  shield: {
    title: 'Tempo esgotado',
    subtitle: 'Complete uma tarefa no Unscroll para ganhar mais minutos.',
    primaryButton: 'Ok',
    notificationTitle: 'Unscroll',
    notificationBody: 'Toque para abrir o app e completar uma tarefa.',
  },
  blockScreen: {
    title: 'Tempo esgotado',
    subtitle: 'Complete uma tarefa e prove com uma foto para ganhar mais minutos.',
    primaryButton: 'Ganhar tempo',
    secondaryButton: 'Agora não',
    streakLabel: 'Sequência de {days} dias',
    notificationTitle: 'Unscroll ativo',
    notificationText: 'Protegendo seu tempo de tela.',
  },
  appPicker: {
    title: 'Apps para bloquear',
    hint: 'Escolha os apps que só abrem com minutos ganhos.',
    confirm: 'Salvar',
    cancel: 'Cancelar',
    selectedCount: '{count} selecionados',
    loadingIcon: 'Ícone do app',
  },
} as const;

export type Strings = typeof strings;
