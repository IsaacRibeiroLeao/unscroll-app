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

Fases 0–6 entregues (planejamento, scaffold, banco, Edge Functions, bloqueio iOS/Android, UI, build/deploy). Falta validação em aparelho e contas reais. Guias: `docs/fase-*.md`; build e testes em `docs/fase-6-build-deploy-testes.md`.

## Banco de dados (Fase 2)

Migrations em `supabase/migrations/` (também em `supabase/full_schema_sql_editor.sql`, para colar no SQL Editor — regenere com a concatenação dos arquivos se mudar uma migration).

```powershell
supabase link --project-ref <ref>
supabase db push
npm run db:types        # gera src/infra/supabase/database.types.ts
```

Testes (apenas em banco local/dev; tudo é revertido com ROLLBACK):

```powershell
supabase start
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/rpc_tests.sql
```

Saída esperada: `ALL DATABASE TESTS PASSED`. Códigos de erro das RPCs são a própria mensagem (`DAILY_LIMIT`, `ALREADY_COMPLETED`, `INSUFFICIENT_GEMS`...).

## Bloqueio nativo (Fases 4A/4B)

Detalhes do iOS em `docs/fase-4a-ios-bloqueio.md`. Testes unitários (Node, sem simulador): `npm test`.
