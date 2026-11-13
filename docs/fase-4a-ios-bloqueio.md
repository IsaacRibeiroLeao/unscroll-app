# Fase 4A — Bloqueio nativo no iOS

## Como funciona (decisão D1: consumo por uso real)

1. `syncBalance(s)` recebe o saldo **do servidor** (depois de reportar o uso pendente).
2. Se `s <= 0`: `blockSelection` (Shield via ManagedSettingsStore) e nenhum monitor ativo.
3. Se `s > 0`, nesta ordem (falha = continua bloqueado): fecha a janela anterior → registra as ações de bloqueio → `startMonitoring` → só então `unblockSelection`.
4. O monitor é um `DeviceActivitySchedule` que começa agora e dura 24 h, com eventos de uso **cumulativo** dos apps escolhidos: `u-300`, `u-600`, …, `u-<saldo>` (passo de 5 min; o último é exato).
5. O último evento (`eventDidReachThreshold`) e o fim do intervalo (`intervalDidEnd`) executam `blockSelection` **na extension ActivityMonitor**, com o app fechado.
6. Os eventos intermediários só servem para contar: ao abrir o app, `getUnreportedUsage()` calcula `maior u-N atingido − já reportado` e o caso de uso `reconcileScreenTime` envia ao servidor (`consume_screen_time`, idempotente por `eventId = <activity>:<N>`).
7. Janela vencida (24 h) ou relógio adiantado: `intervalDidEnd` bloqueia (fail-closed) e o saldo é re-sincronizado ao abrir o app.

Fallback documentado se os thresholds não funcionarem em aparelho: janela de relógio (`DeviceActivitySchedule` exige intervalo ≥ ~15 min). Trocar só `buildUsagePlan`/`applyBalance`.

> Nomes de activity/evento **não podem conter `_`**: a lib faz `key.split('_')` ao ler o histórico.

## Arquivos

| Arquivo                                                                          | Papel                                                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/application/ports/IScreenBlockerService.ts`                                 | Interface (sem plataforma)                                               |
| `src/infra/native/ScreenBlocker.ts`                                              | Re-export de tipos + fallback "unsupported" (web/Android até a 4B)       |
| `src/infra/native/ScreenBlocker.ios.ts`                                          | Liga o serviço à `react-native-device-activity`                          |
| `src/infra/native/ios/IosScreenBlockerService.ts`                                | Lógica (testável em Node, porta injetada)                                |
| `src/infra/native/ios/usagePlan.ts`                                              | Plano de eventos, consumo, ids (puro)                                    |
| `src/infra/native/ios/pickerBridge.ts` + `ScreenBlockerHost.ios.tsx`             | `pickApps()` ↔ `DeviceActivitySelectionSheetView` (montado no `_layout`) |
| `src/infra/native/createScreenBlocker.ts`                                        | Factory/singleton                                                        |
| `src/application/reconcileScreenTime.ts` + `src/infra/supabase/screenTimeApi.ts` | Reconciliação com o servidor                                             |

## Config plugin / EAS

O plugin da biblioteca (em `app.config.ts`) cria as 3 extensions em `targets/` e adiciona entitlement + App Group. Ele também preenche `extra.eas.build.experimental.ios.appExtensions`, que é como o EAS descobre as extensions e gera os provisioning profiles (verificado com `expo config`). Bundle ids gerados (base `com.unscroll.app`):

- `com.unscroll.app`
- `com.unscroll.app.ActivityMonitorExtension` ← atenção: o README da lib diz `.ActivityMonitor`, mas o plugin 0.6.1 gera **`.ActivityMonitorExtension`**
- `com.unscroll.app.ShieldAction`
- `com.unscroll.app.ShieldConfiguration`

`APPLE_TEAM_ID` precisa estar definido no build (`eas env:create`). App Group: `group.com.unscroll.app` (deve ser o mesmo no app e nas extensions).

## Entitlement: desenvolvimento × distribuição

- **Desenvolvimento** (`com.apple.developer.family-controls`): funciona com Apple Developer Program pago, aparelho registrado (`eas device:create`) e build `development`. Não precisa de aprovação.
- **Distribuição** (TestFlight/App Store): exige **aprovação da Apple** para cada um dos 4 bundle ids acima (https://developer.apple.com/contact/request/family-controls-distribution). Depois, ativar "Family Controls (Distribution)" em _Additional Capabilities_ de cada identifier. Sem isso, aparecem erros estranhos de provisioning. Muda o bundle id => pedir de novo.

## Limitações conhecidas

- `onBlockedAppOpened` não existe no iOS (a ShieldAction não chama JS). O botão do Shield fecha e envia notificação local; ligar o toque da notificação ao app é da Fase 5. O `openApp` da lib usa um scheme fixo (`device-activity://`), por isso não foi usado.
- O seletor (`DeviceActivitySelectionSheetView`) pode travar (SwiftUI); Cancel e Done chegam ambos em `onDismissRequest`.
- Autorização revogada fora do app só é percebida após reiniciar o app (README da lib).
- Saldo exibido mid-janela tem granularidade de 5 min; o bloqueio final é exato.

## Checklist em iPhone físico (iOS ≥ 16.4)

Pré: build development instalado, Screen Time autorizado, 1–2 apps escolhidos (use saldo de 6 min para testar rápido: `syncBalance(360)`).

- [ ] Saldo 0: abrir app bloqueado mostra o Shield em pt-BR.
- [ ] `syncBalance(360)`: app abre; usar ~6 min; Shield volta sozinho **com o Unscroll em background**.
- [ ] Idem com o **Unscroll morto** (swipe up): Shield volta ao zerar.
- [ ] Abrir o Unscroll depois: `getUnreportedUsage` = ~360 s; após `reconcileScreenTime`, saldo no servidor bate (±5 min).
- [ ] **Reiniciar o aparelho** com saldo > 0: o monitor continua e o Shield volta ao zerar; com saldo 0 o Shield continua ativo.
- [ ] **Adiantar o relógio** > 24 h: apps bloqueiam; atrasar o relógio não ganha tempo.
- [ ] **Revogar** Screen Time em Ajustes: `getPermissionStatus` ≠ granted após reabrir; `startMonitoring` lança `NOT_AUTHORIZED`.
- [ ] Trocar a seleção de apps com saldo > 0: saldo preservado, novos apps contam, antigos liberados.
- [ ] Modo Pouca Energia ligado/desligado: eventos disparam? (a Apple/README citam falhas com Low Power Mode).
- [ ] 24 eventos por monitor (saldo 120 min) registram sem erro; se falhar, aumentar `USAGE_STEP_SECONDS`.

## Verificado × pendente

- **Verificado aqui:** `tsc`, `eslint`, `prettier`, 29 testes Node (plano de eventos, estados, fail-closed, reconciliação), `expo prebuild` iOS/Android, `expo export` iOS e Android (Metro empacota com resolução `.ios`/fallback).
- **Só em aparelho:** tudo da lista acima, o formato real do payload de `onDeviceActivityMonitorEvent` e o comportamento dos thresholds com app morto.
- **TODO(verificar):** `callbackNameOf` (formato do evento), semântica de Cancel/Done no seletor, limite prático de eventos por monitor.
