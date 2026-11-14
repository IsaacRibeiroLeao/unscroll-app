# create-checkout

Cria o link de pagamento (Checkout Pro do Mercado Pago: Pix e cartão) para o usuário logado. JWT obrigatório.

- `{ "action": "plans" }` → planos com preço e vagas do Fundador (valores sempre do servidor).
- `{ "plan": "monthly" | "annual" | "lifetime" }` → `{ "url": "<checkout>" }`.
- Preços (centavos): mensal 2490, anual 14990, Fundador 7900 (limite de 100 vagas, uma por conta). Alterar em `logic.ts`.
- `external_reference` = `userId:plano:valor:nonce`; o webhook confere o valor pago contra ele.
- Secret: `MP_ACCESS_TOKEN`.

```powershell
supabase secrets set MP_ACCESS_TOKEN=<token-de-producao>
supabase functions deploy create-checkout
cd supabase\functions\create-checkout; deno test --allow-env
```
