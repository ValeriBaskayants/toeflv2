export function normalizeWord(s: string): string {
  return s.trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}