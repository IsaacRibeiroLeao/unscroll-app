export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'WEAK_PASSWORD'
  | 'EMAIL_INVALID'
  | 'EMAIL_NOT_CONFIRMED'
  | 'RATE_LIMITED'
  | 'SIGNUP_DISABLED'
  | 'RECOVERY_LINK_INVALID'
  | 'SAME_PASSWORD'
  | 'NETWORK'
  | 'UNKNOWN';

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
  }
}

/** `confirmEmail`: the account exists but the user must open the email link before signing in. */
export type SignUpResult = 'signedIn' | 'confirmEmail';

export interface IAuthService {
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signOut(): Promise<void>;
  /** Sends the password-reset email; the link opens the app at `unscroll://reset`. */
  requestPasswordReset(email: string): Promise<void>;
  /** Turns the deep link from the reset email into a session; throws RECOVERY_LINK_INVALID. */
  completeRecovery(url: string): Promise<void>;
  /** Sets a new password for the signed-in (recovery) session. */
  updatePassword(newPassword: string): Promise<void>;
  /** Permanently deletes the account and its data (server side), then clears the local session. */
  deleteAccount(): Promise<void>;
  /** Email of the signed-in user, or null when signed out. */
  currentEmail(): Promise<string | null>;
}
