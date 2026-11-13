# Fase 5 — UI e gamificação

## Arquitetura

- `src/domain`: progressão (nível n→n+1 = 100·n XP), formatação de tempo, humor/skin do mascote. Só exibição:
  XP, gemas, saldo e limites vêm do servidor.
- `src/application`: casos de uso puros e testados (`submitTaskProof`, `purchaseShopItem`,
  `syncScreenTime`, `awaitPro`, `buildBlockScreenInfo`, mapeamento de erros) + portas `IBackendApi` e
  `IPurchasesService`.
- `src/infra/supabase`: cliente com sessão em SecureStore (armazenamento em pedaços), sessão anônima,
  adapter `createBackendApi` (zod nas respostas), upload da foto (JPEG ≤1280px) para
  `proofs/{uid}/{taskId}-{ts}.jpg` e chamada da Edge Function. `src/infra/revenuecat`: paywall.
- `src/presentation`: componentes (Mascot em SVG, MascotHeader, TaskCard, Button), estado
  (react-query + zustand), `container.ts` (composition root), rotas em `src/app`.

## Rotas

`/` Home · `/onboarding` · `/new-task` · `/proof/[taskId]` (câmera ao vivo, sem galeria) ·
`/celebration` · `/shop` · `/paywall` · `/blocked` (alvo de `unscroll://blocked`).

## Fluxos

- Foreground (início e ao voltar ao app): reporta uso nativo → lê perfil → `syncBalance(saldo do servidor)`
  → re-arma o bloqueio (`startMonitoring`). Se o relato falhar, o saldo nativo NÃO é sobrescrito.
- Prova: foto → upload → Edge Function → se aprovada, `syncBalance(newBalanceSeconds)` → celebração.
  A foto local é apagada após o envio.
- Loja: compra via RPC; passe livre re-sincroniza o saldo nativo. Skins via `set_active_mascot_skin`.
- Pro: o app só abre a compra (RevenueCat) e consulta `profiles.is_pro` algumas vezes; quem grava é o webhook.
- Toque em notificação (iOS Shield) → `/blocked`.

## Configuração necessária

- Supabase: ativar **Authentication → Sign In / Providers → Anonymous sign-ins**.
- `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
  `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
- RevenueCat: offering "current" com pacotes `$rc_monthly` e `$rc_annual`; trial de 3 dias na loja;
  webhook → função que atualiza `profiles.is_pro` (planejada na Fase 0; ainda não implementada neste repo).

## Não verificado (precisa de aparelho/contas)

- Layout/aparência real das telas, câmera, haptics, animação.
- Upload + Edge Function ponta a ponta (precisa de projeto Supabase e `GEMINI_API_KEY`).
- Compra real e webhook; `Purchases.logIn` com id anônimo.
- Toque em notificação no cold start (iOS).
- Sessão anônima é perdida se o app for desinstalado (sem recuperação de conta ainda).
