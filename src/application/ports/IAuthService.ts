export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'WEAK_PASSWORD'
  | 'EMAIL_INVALID'
  | 'EMAIL_NOT_CONFIRMED'
  | 'RATE_LIMITED'
  | 'SIGNUP_DISABLED'
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
  /** Email of the signed-in user, or null when signed out. */
  currentEmail(): Promise<string | null>;
}
