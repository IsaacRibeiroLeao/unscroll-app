# Unscroll (nome provisório)

App de produtividade/detox digital: o acesso aos apps de distração é comprado com **tarefas reais comprovadas por foto**, com gamificação estilo Duolingo.

- **Stack:** Expo SDK 58 (dev client, New Architecture), expo-router, TypeScript strict, NativeWind v4, Reanimated, TanStack Query + Zustand, zod, Supabase.
- **Sem Expo Go:** módulos nativos exigem `expo-dev-client` + EAS Build.
- **CNG:** `ios/` e `android/` não são versionados. Todo código nativo vive em `modules/` e `plugins/`. Nunca edite `ios/`/`android/`.

## Setup (Windows / PowerShell)

```powershell
npm install
Copy-Item .env.example .env
npx expo-doctor
npm run typecheck
npm run lint
```

Variáveis: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `APPLE_TEAM_ID` (build). A chave do Gemini existe **somente** em `supabase secrets`.

## Rodar

```powershell
# gerar build de desenvolvimento (uma vez / quando mudar código nativo)
eas build --profile development --platform android
eas build --profile development --platform ios   # iPhone físico; exige Apple Developer paga

npx expo start --dev-client
```

iOS: APIs de Screen Time não funcionam no Simulator. Registre o aparelho com `eas device:create`.

## Arquitetura

```
src/app/            rotas (expo-router)
src/domain/         regras puras (streak, nível, recompensas) — sem RN/Supabase
src/application/    casos de uso
src/infra/          supabase, gemini, revenuecat, native
src/presentation/   telas, componentes, tema
src/strings/        textos de UI (pt-BR, preparado para i18n)
modules/            Expo Module local (bloqueio nativo)
plugins/            config plugins
supabase/           migrations, functions, tests
docs/               planejamento (Fase 0)
```

Código específico de plataforma só atrás de `IScreenBlockerService`.

## iOS: entitlement Family Controls

`app.config.ts` usa o plugin `react-native-device-activity`, que cria as extensions (ActivityMonitor, ShieldAction, ShieldConfiguration) e adiciona o entitlement e o App Group. O entitlement de **desenvolvimento** funciona com conta paga em aparelho físico; **distribuição** (TestFlight/App Store) exige aprovação da Apple (cada bundle id, inclusive extensions).

## Status

Fase 1 (scaffold) concluída. Próximas: banco (2), Edge Function (3), bloqueio nativo (4A/4B), UI (5), build/deploy (6).
