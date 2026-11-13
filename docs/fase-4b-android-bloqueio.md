# Fase 4B — Bloqueio nativo no Android

## Arquitetura

- `modules/screen-blocker` (Expo Module local, Kotlin, só Android). Manifest do módulo declara o
  serviço, o `BootReceiver` e `<queries>` (MAIN/LAUNCHER). Sem `QUERY_ALL_PACKAGES`. Isso substitui o
  config plugin previsto: o merge de manifest funciona com CNG e mantém código nativo só em `modules/`.
- `BlockerService` (foreground, tipo `specialUse`): consulta `UsageStatsManager.queryEvents` a cada
  ~750 ms; com app bloqueado em primeiro plano desconta tempo REAL (relógio monotônico, D1) do saldo
  espelhado em SharedPreferences; saldo 0 → overlay `TYPE_APPLICATION_OVERLAY` com mascote.
- Saldo/uso em `Ledger` (puro, testado em JVM). IDs de uso `installId:totalConsumido` são
  idempotentes (`client_event_id`). Servidor continua a fonte da verdade (`setBalanceFromServer`
  desconta o que ainda não foi reportado).
- JS: `AndroidScreenBlockerService` (testado em Node) → `ScreenBlocker.android.ts`; seletor de apps em
  `ScreenBlockerHost.android.tsx`. Texto da tela de bloqueio vem de `strings.blockScreen` via
  `setBlockScreenInfo`.
- Correção da 4A: o host iOS foi movido para `src/infra/native/ScreenBlockerHost.ios.tsx` (antes estava
  em `ios/`, onde o Metro não o resolvia por plataforma).

## Política da Google Play (declarar no Play Console)

- Foreground service `specialUse`: justificativa = detectar app em primeiro plano para limites
  escolhidos pelo próprio usuário.
- `PACKAGE_USAGE_STATS` e `SYSTEM_ALERT_WINDOW`: usar no formulário de permissões sensíveis; incluir
  divulgação proeminente dentro do app antes de abrir as Configurações (tela chega na Fase 5).
- Não usamos AccessibilityService nem QUERY_ALL_PACKAGES.

## O que NÃO foi verificado (precisa de aparelho/Gradle)

- `ScreenBlockerModule.kt` (cola com expo-modules-core) e o build Gradle completo: o Gradle do sandbox
  não baixa plugins (foojay). Compilados com kotlinc contra android.jar: todos os demais .kt.
- Comportamento real: polling, overlay sobre outros apps, restrições de background Android 12–15,
  sobrevivência após reboot, OEMs agressivos (Xiaomi/Samsung/Huawei).

## Checklist de teste em aparelho (Android 13+ e 15)

1. `npx expo run:android` (ou EAS dev build); abrir app → conceder: Acesso ao uso, Sobrepor a outros
   apps, Notificações, Ignorar otimização de bateria (`requestPermissions()` abre uma por vez).
2. `pickApps()` → escolher Instagram; `startMonitoring()` com app em primeiro plano.
3. `syncBalance(60)`; abrir Instagram: saldo cai ~1 s/s; em 0 aparece o overlay; Voltar vai para Home.
4. "Ganhar tempo" abre `unscroll://blocked` (rota chega na Fase 5).
5. Matar o app pelo recents: o serviço continua e bloqueia. Reiniciar o aparelho: serviço volta.
6. Mudar o horário do sistema: o saldo não pode aumentar.
7. `getUnreportedUsage()` → `markUsageReported()` → segundo call vem vazio.
