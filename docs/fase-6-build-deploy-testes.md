# Fase 6 — Build, deploy, troubleshooting e roteiro de teste

Comandos para PowerShell (sem `&&`). Itens marcados `TODO(verificar)` dependem da versão do CLI:
confirme com `--help`.

## 1. Pré-requisitos

- Node 22 LTS, `npm ci`, conta Expo (`npx eas-cli login`), Supabase CLI, (opcional) Deno para testar as funções.
- Android local (opcional): JDK 17 + Android SDK. Sem isso, use EAS Build.
- iOS: conta Apple Developer paga + aparelho físico. Sem macOS, só via EAS Build.

## 2. Supabase (uma vez)

```powershell
supabase init                      # se ainda não existir supabase/config.toml
supabase link --project-ref <ref>
supabase db push                   # aplica as 4 migrations
```

Painel: **Authentication → Providers → Anonymous sign-ins = ON**.

```powershell
supabase secrets set GEMINI_API_KEY=<chave>
supabase secrets set REVENUECAT_WEBHOOK_SECRET=<segredo-longo-aleatorio>
supabase functions deploy verify-task-proof
supabase functions deploy revenuecat-webhook --no-verify-jwt
```

`revenuecat-webhook` usa `--no-verify-jwt` porque quem chama é o RevenueCat (autenticado pelo segredo).

## 3. RevenueCat

1. Projeto com apps iOS e Android; produtos mensal (R$ 24,90) e anual (R$ 149,90) com 3 dias de trial nas lojas.
2. Offering **current** com pacotes `$rc_monthly` e `$rc_annual`.
3. Integrations → Webhooks: URL `https://<ref>.supabase.co/functions/v1/revenuecat-webhook`,
   Authorization = o mesmo `REVENUECAT_WEBHOOK_SECRET`.
4. Chaves públicas do SDK → variáveis do app (abaixo).

## 4. Variáveis do app

Local: copie `.env.example` para `.env` e preencha. No EAS (para builds na nuvem):

```powershell
# TODO(verificar): sintaxe com `eas env:create --help`
eas env:create --environment development --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext
eas env:create --environment development --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon> --visibility plaintext
eas env:create --environment development --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value <chave> --visibility plaintext
eas env:create --environment development --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value <chave> --visibility plaintext
eas env:create --environment development --name APPLE_TEAM_ID --value <TEAMID> --visibility plaintext
```

Repita para `preview` e `production`. Nunca ponha `GEMINI_API_KEY` ou a service role no app.

## 5. Builds

```powershell
eas init                                   # preenche extra.eas.projectId
eas build --profile development --platform android     # APK com dev client (instala no aparelho)
npx expo start --dev-client                # depois de instalar o APK
```

iOS (exige conta paga + entitlement Family Controls para os 4 bundle ids: app + 3 extensions):

```powershell
eas build --profile development --platform ios         # registra o aparelho e as extensions
```

Distribuição interna / loja: `--profile preview` (APK) e `--profile production` (AAB / IPA). Distribuição
iOS depende da aprovação da Apple para Family Controls.

Build local Android (opcional): `npx expo run:android` (compila o módulo Kotlin e mostra erros que o
sandbox não conseguiu validar).

## 6. Checagens antes de cada build

```powershell
npm run typecheck; npm run lint; npm test
npx expo-doctor
```

Funções: `cd supabase\functions\verify-task-proof; deno test --allow-env` (idem `revenuecat-webhook`).
Banco: `psql "<url local>" -v ON_ERROR_STOP=1 -f supabase/tests/rpc_tests.sql` → `ALL DATABASE TESTS PASSED`.

## 7. Troubleshooting

| Sintoma                                                                      | Causa provável                                                    | Ação                                                                                                          |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Tela "Não foi possível entrar"                                               | Anonymous sign-ins desligado, URL/anon key erradas, sem internet  | Ativar no painel; conferir `.env`; reiniciar com `npx expo start -c`                                          |
| `Missing EXPO_PUBLIC_SUPABASE_URL`                                           | `.env` ausente no build                                           | Variáveis do EAS por ambiente                                                                                 |
| Prova sempre "Tentar de novo / não conseguimos verificar" (`AI_UNAVAILABLE`) | `GEMINI_API_KEY` ausente/inválida                                 | `supabase secrets set`, ver `supabase functions logs verify-task-proof`                                       |
| Erro 403 `FORBIDDEN_PATH`                                                    | Upload fora de `{uid}/`                                           | Não alterar o caminho do upload                                                                               |
| Pro não ativa após compra                                                    | Webhook sem segredo, URL errada ou função sem `--no-verify-jwt`   | Painel RevenueCat → eventos; logs `revenuecat-webhook`; o app tenta ~12 s e depois só relê no próximo refresh |
| Paywall "indisponível"                                                       | Sem offering current / chave do SDK errada / produto não aprovado | Conferir RevenueCat e lojas                                                                                   |
| Android: "Acesso ao uso"/"Sobrepor" cinza                                    | APK instalado fora da loja (Android 13+: configurações restritas) | Configurações → Apps → Unscroll → ⋮ → Permitir configurações restritas                                        |
| Android: bloqueio some após um tempo                                         | Economia de bateria do fabricante                                 | Conceder "ignorar otimização de bateria"; guia dontkillmyapp.com                                              |
| Android: serviço não inicia                                                  | Android 12+ não permite iniciar serviço em segundo plano          | Abrir o app (o app re-arma ao ir para primeiro plano)                                                         |
| iOS: tela de Tempo de Uso não aparece                                        | Entitlement Family Controls ausente no perfil                     | Ver `docs/fase-4a-ios-bloqueio.md`; reconstruir com `APPLE_TEAM_ID`                                           |
| `expo prebuild` avisa `appleTeamId`                                          | `APPLE_TEAM_ID` não definido                                      | `$env:APPLE_TEAM_ID="XXXXXXXXXX"`                                                                             |
| Gradle não baixa plugins (sandbox)                                           | Rede restrita                                                     | Rodar na sua máquina / EAS                                                                                    |
| Metro com cache velho                                                        | —                                                                 | `npx expo start -c`                                                                                           |
| `git push` 403                                                               | App do Claude sem acesso ao repo                                  | Instalar o GitHub App ou dar push do bundle manualmente                                                       |

## 8. Roteiro de teste manual

Pré-condição: build de desenvolvimento instalado em Android 13+ (e iPhone físico, se possível), projeto
Supabase com migrations, funções publicadas e Gemini configurado.

**A. Entrada e onboarding**

1. Primeira abertura: entra sem login e cai no onboarding. (Supabase → Auth → Users mostra 1 usuário anônimo.)
2. Conceder permissões (Android: 3 telas de Configurações, uma por vez; iOS: pop-up de Tempo de Uso).
3. Escolher 1+ app (ex.: Instagram). "Próximo" só habilita com seleção.
4. Permitir notificações → cai na Home com 00:00 e mascote sonolento.

**B. Tarefas e prova** 5. Criar tarefa "Lavar a louça" (uma vez). Aparece na lista; criar >10 no mesmo dia → erro de limite. 6. Provar com foto da pia limpa → "Mandou bem!" +20 min, +50 XP, +25 gemas, sequência 1; Home mostra 20:00. 7. Foto sem relação (parede) em outra tarefa → mensagem de rejeição; saldo igual. 8. Foto escura/tremida → "ficou escura…". 9. Repetir a MESMA foto aprovada em outra tarefa → rejeitada (hash). 10. Plano grátis: 2ª tarefa aprovada no mesmo dia → "limite diário". Com Pro: até 5. 11. No Storage (bucket `proofs`) não sobra nenhuma foto depois de cada tentativa (LGPD). 12. Modo avião durante o envio → mensagem de rede, tarefa volta a "Provar".

**C. Bloqueio** 13. Com 20 min: abrir Instagram; Android: saldo cai ~1 s/s (`getBalance`), iOS: bloqueia ao atingir o limite. 14. Zerar (ou criar saldo 1 min e esperar): Android mostra a tela de bloqueio com mascote e streak; iOS
mostra o Shield e envia notificação. Botão "Ganhar tempo"/toque na notificação abre `/blocked`. 15. Android: Voltar na tela de bloqueio vai para a tela inicial; matar o app pelos recentes → continua bloqueando. 16. Reiniciar o aparelho: bloqueio volta sozinho (Android após o 1º desbloqueio do usuário). 17. Mudar o relógio do sistema para frente: saldo não aumenta. 18. Voltar ao app: uso é reportado (Supabase `screen_time_logs` com `app_usage`) e a Home mostra o saldo do servidor. 19. Ganhar tempo com o app bloqueado → desbloqueia na hora.

**D. Loja** 20. Comprar skin (500) sem gemas → erro; com gemas → "Em uso"/"Usar" funciona e muda o mascote e a tela de bloqueio. 21. Comprar proteção de sequência (200): 3ª compra bloqueada por limite 2. 22. Passe livre 30 min (350): saldo +30 min (limite 2 h → erro `BALANCE_CAP` perto do teto).

**E. Pro** 23. Paywall mostra preços da loja; compra de teste (sandbox) → "Ativando seu Pro…" → badge Pro em ~segundos. 24. Restaurar compras em outro aparelho. Expirar assinatura (sandbox) → `is_pro` volta a false.

**F. Dia/fuso e sequência** 25. Concluir tarefa em dois dias seguidos → sequência 2; pular 1 dia com proteção → mantém; sem proteção → reinicia. 26. Aparelho em outro fuso: o "dia" usa o fuso gravado no perfil (o app envia o fuso na abertura).

Registre falhas com: passo, aparelho/versão do SO, e `supabase functions logs <função>` do mesmo horário.
