# revenuecat-webhook

Único escritor de `profiles.is_pro` (via `apply_pro_status`, só `service_role`).

- `POST` com header `Authorization: <REVENUECAT_WEBHOOK_SECRET>` (valor configurado no painel do RevenueCat).
- Concede Pro em `INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `UNCANCELLATION`,
  `NON_RENEWING_PURCHASE`, `SUBSCRIPTION_EXTENDED`, `TEMPORARY_ENTITLEMENT_GRANT` (se `expiration_at_ms` ainda não passou).
- Revoga em `EXPIRATION`. `CANCELLATION`/`BILLING_ISSUE` mantêm o acesso até a expiração (ignorados).
- O app usa o id do usuário Supabase como `app_user_id` (`Purchases.logIn`). IDs anônimos do RevenueCat
  são confirmados (200) sem escrever nada.
- Eventos fora de ordem não sobrescrevem um mais novo (`pro_event_at`).
- Erro de banco → 500 (o RevenueCat tenta de novo).

```powershell
supabase secrets set REVENUECAT_WEBHOOK_SECRET=<segredo-longo-aleatorio>
supabase functions deploy revenuecat-webhook --no-verify-jwt
# testes
cd supabase\functions\revenuecat-webhook; deno test --allow-env
```
