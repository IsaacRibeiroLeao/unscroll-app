# mercadopago-webhook

Único escritor do Pro comprado na web (via `apply_web_payment` / `revoke_web_payment`, só `service_role`).

- Valida a assinatura `x-signature` (HMAC-SHA256 do manifesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` com `MP_WEBHOOK_SECRET`).
- Nunca confia no corpo da notificação: busca o pagamento na API do Mercado Pago (`MP_ACCESS_TOKEN`) e confere status `approved`, moeda BRL e valor igual ao da referência criada pelo `create-checkout`.
- Idempotente: um pagamento vira uma linha em `payments` (único por provider + id); reentregas não estendem o Pro de novo.
- `refunded` / `charged_back` desfazem exatamente o que aquele pagamento concedeu.
- Erro transitório → 500 (o Mercado Pago tenta de novo).

```powershell
supabase secrets set MP_ACCESS_TOKEN=<token-de-producao> MP_WEBHOOK_SECRET=<segredo-do-webhook>
supabase functions deploy mercadopago-webhook --no-verify-jwt
cd supabase\functions\mercadopago-webhook; deno test --allow-env
```

Painel do Mercado Pago: Suas integrações > Webhooks > URL de produção
`https://<projeto>.supabase.co/functions/v1/mercadopago-webhook`, evento **Pagamentos**.
