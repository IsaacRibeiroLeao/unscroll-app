// verify-task-proof — validates a task-completion photo with Gemini and grants rewards via RPC.
// Request : POST { taskId: string, imagePath: string }   (Authorization: Bearer <user JWT>)
// Response: 200 { approved, confidence, feedback, code, rewards } | 4xx/5xx { error, code }
import { createSupabaseDeps } from './deps.ts';
import { handle } from './handler.ts';

const deps = createSupabaseDeps();
Deno.serve((req) => handle(req, deps));
