export const PASSWORD_MIN_LENGTH = 8;

export type CredentialIssue = 'EMAIL_INVALID' | 'PASSWORD_SHORT';

/** Pragmatic shape check; the server remains the authority on what is a deliverable address. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** First problem with the typed credentials, or null when they can be submitted. */
export function validateCredentials(email: string, password: string): CredentialIssue | null {
  if (!EMAIL_SHAPE.test(normalizeEmail(email))) return 'EMAIL_INVALID';
  if (password.length < PASSWORD_MIN_LENGTH) return 'PASSWORD_SHORT';
  return null;
}
