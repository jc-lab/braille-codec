export const BRAILLE_UNICODE_START = 0x2800;

export function decodeUnicode(char: string): number {
  const code = char.charCodeAt(0);
  if (code >= BRAILLE_UNICODE_START && code <= BRAILLE_UNICODE_START + 0x3f) {
    return code - BRAILLE_UNICODE_START;
  }
  return -1;
}

export function encodeUnicode(dot: number): string {
  if (dot === 255) return '\n';
  return String.fromCharCode(BRAILLE_UNICODE_START + dot);
}
