# delete-account

Apaga de vez a conta de quem chamou (LGPD): fotos em `proofs/{uid}/`, depois o usuário em `auth.users` (as FKs apagam perfil, tarefas, verificações, logs e compras). Registros de `payments` ficam, sem ligação com a pessoa (`user_id` vira `null`). JWT obrigatório; só age sobre o id do próprio chamador.

```powershell
supabase functions deploy delete-account
cd supabase\functions\delete-account; deno test --allow-env
```
