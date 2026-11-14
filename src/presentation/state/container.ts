// Composition root: the only place that wires concrete adapters to the ports.
import { QueryClient } from '@tanstack/react-query';
import { createScreenTimeApi } from '../../infra/supabase/screenTimeApi';
import { createAuthService } from '../../infra/supabase/authService';
import { createBackendApi } from '../../infra/supabase/backendApi';
import { supabase } from '../../infra/supabase/client';
import { discardPhoto, preparePhotoBytes } from '../../infra/supabase/proofPhoto';
import { getScreenBlocker } from '../../infra/native/createScreenBlocker';
import { purchasesService } from '../../infra/revenuecat/purchasesService';
import type { ErrorTexts } from '../../application/errorMessages';
import { strings } from '../../strings/pt-BR';

export const backend = createBackendApi(supabase, { preparePhoto: preparePhotoBytes });
export const screenTimeApi = createScreenTimeApi((fn, args) => supabase.rpc(fn, args));
export const auth = createAuthService(supabase);
export const blocker = getScreenBlocker();
export const purchases = purchasesService;
export { discardPhoto, supabase };

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

export const errorTexts: ErrorTexts = { errors: strings.errors, proof: strings.proofResult };

export const BLOCKED_DEEP_LINK = 'unscroll://blocked';
