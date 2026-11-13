# verify-task-proof

Validates a task-completion photo with Gemini and grants rewards through `complete_task_and_reward` (service_role).

## Contract

`POST /functions/v1/verify-task-proof` with `Authorization: Bearer <user JWT>`

```json
{ "taskId": "<uuid>", "imagePath": "<uid>/<file>.jpg" }
```

`imagePath` is the object path inside the private `proofs` bucket (`proofs/<uid>/<file>` is also accepted). The client resizes (longest side ≤ 1024 px, JPEG ~0.6) and uploads before calling.

200 → `{ approved, confidence, feedback, code, rewards }`, `code` ∈ `APPROVED | REJECTED | LOW_QUALITY | AI_UNAVAILABLE | DAILY_LIMIT | ALREADY_COMPLETED`.
`rewards` (only on APPROVED) = `{ minutes, xp, gems, new_streak, streak_incremented }` **plus** `new_balance_seconds, new_xp, new_gems` (extra totals so the app can sync the native balance and the UI without computing anything).

4xx/5xx → `{ error, code }`: `INVALID_REQUEST 400`, `INVALID_IMAGE 400`, `UNAUTHORIZED 401`, `FORBIDDEN_PATH 403`, `TASK_NOT_FOUND 404`, `PROFILE_NOT_FOUND 404`, `IMAGE_NOT_FOUND 404`, `METHOD_NOT_ALLOWED 405`, `TASK_BUSY 409`, `IMAGE_TOO_LARGE 413`, `TOO_MANY_ATTEMPTS 429`, `INTERNAL 500`.

## Behaviour

- Photo is **always deleted** from Storage after the request (decision or error). On retry the client uploads again.
- AI failure (`AI_UNAVAILABLE`) returns the task to `pending` and is **not** counted as an attempt (only REJECTED/LOW_QUALITY count; max 5/task/day).
- Approved needs `confidence >= 0.7`. Same approved photo hash cannot be reused.
- Stale `verifying` locks (> 2 min) can be taken over.
- Logs contain only event names / status / timings (no user ids, paths or feedback text).

## Config

| Variable                                    | Where                             | Notes                                       |
| ------------------------------------------- | --------------------------------- | ------------------------------------------- |
| `GEMINI_API_KEY`                            | `supabase secrets set`            | never `EXPO_PUBLIC_*`                       |
| `GEMINI_MODEL`                              | `supabase secrets set` (optional) | default `gemini-2.5-flash`                  |
| `ALLOWED_ORIGIN`                            | optional                          | default `*` (native app does not need CORS) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | provided by Supabase              |                                             |

## Test (Deno)

```powershell
cd supabase\functions\verify-task-proof
deno test --allow-env
deno check index.ts
```

## Deploy

```powershell
supabase login
supabase link --project-ref <ref>
supabase secrets set GEMINI_API_KEY=<key>
supabase functions deploy verify-task-proof
```

(`verify_jwt` stays enabled; the function also verifies the JWT itself.)
