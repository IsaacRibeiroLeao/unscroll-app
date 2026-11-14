/** Replaces `{name}` placeholders in pt-BR templates. */
export function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), template);
}

/** 2490 -> "R$ 24,90" (pt-BR, no Intl dependency). */
export function formatBRL(cents: number): string {
  const reais = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `R$ ${String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${rest}`;
}
