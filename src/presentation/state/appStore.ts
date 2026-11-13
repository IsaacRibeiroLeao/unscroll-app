import { create } from 'zustand';
import type { ProofOutcome } from '../../application/ports/IBackendApi';

interface AppState {
  userId: string | null;
  /** null until the persisted flag is read. */
  onboarded: boolean | null;
  /** Last approved proof, consumed by the celebration screen. */
  lastProof: { outcome: ProofOutcome; blockerFailed: boolean } | null;
  setUserId: (id: string | null) => void;
  setOnboarded: (value: boolean) => void;
  setLastProof: (proof: AppState['lastProof']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  userId: null,
  onboarded: null,
  lastProof: null,
  setUserId: (userId) => set({ userId }),
  setOnboarded: (onboarded) => set({ onboarded }),
  setLastProof: (lastProof) => set({ lastProof }),
}));
