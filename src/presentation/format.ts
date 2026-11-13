/** Replaces `{name}` placeholders in pt-BR templates. */
export function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), template);
}
