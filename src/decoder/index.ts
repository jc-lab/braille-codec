import {
  BRAILLE_UNICODE_START,
  ASCII_BRAILLE_MAP,
  KOREAN_CHOSEONG,
  KOREAN_JUNGSEONG,
  KOREAN_JONGSEONG,
  KOREAN_SHORTCUTS,
  ENGLISH_ALPHABET,
  NUMBERS,
  SYMBOLS,
  NUMBER_INDICATOR,
  ENGLISH_INDICATOR,
  ENGLISH_TERMINATOR,
  UPPERCASE_INDICATOR,
  KOREAN_PART_INDICATOR,
  KOREAN_CONSONANT_INDICATOR,
} from './constants';

/**
 * Braille Decoder
 * Supports English, Special Characters, and Korean.
 * Reference: braillify/libs/braillify/src
 */
export class Decoder {
  // Pre-computed lookup tables for efficient access
  private jungseongMap: Map<string, { text: string; len: number }[]> = new Map();
  private shortcutMap: Map<string, { text: string; len: number }[]> = new Map();
  private symbolMap: Map<string, { text: string; len: number }[]> = new Map();

  constructor() {
    this.initializeLookupTables();
  }

  /**
   * Initialize lookup tables from constants for efficient decoding
   */
  private initializeLookupTables(): void {
    // Build jungseong lookup table
    for (const [key, text] of Object.entries(KOREAN_JUNGSEONG)) {
      const dots = key.split(',').map(Number);
      const firstDot = dots[0].toString();
      if (!this.jungseongMap.has(firstDot)) {
        this.jungseongMap.set(firstDot, []);
      }
      this.jungseongMap.get(firstDot)!.push({ text, len: dots.length });
    }
    // Sort by length descending (try longer patterns first)
    for (const entries of this.jungseongMap.values()) {
      entries.sort((a, b) => b.len - a.len);
    }

    // Build shortcut lookup table
    for (const [key, text] of Object.entries(KOREAN_SHORTCUTS)) {
      const dots = key.split(',').map(Number);
      const firstDot = dots[0].toString();
      if (!this.shortcutMap.has(firstDot)) {
        this.shortcutMap.set(firstDot, []);
      }
      this.shortcutMap.get(firstDot)!.push({ text, len: dots.length });
    }
    for (const entries of this.shortcutMap.values()) {
      entries.sort((a, b) => b.len - a.len);
    }

    // Build symbol lookup table
    for (const [key, text] of Object.entries(SYMBOLS)) {
      const dots = key.split(',').map(Number);
      const firstDot = dots[0].toString();
      if (!this.symbolMap.has(firstDot)) {
        this.symbolMap.set(firstDot, []);
      }
      this.symbolMap.get(firstDot)!.push({ text, len: dots.length });
    }
    for (const entries of this.symbolMap.values()) {
      entries.sort((a, b) => b.len - a.len);
    }
  }
  /**
   * Converts ASCII Braille (BRL) to Unicode Braille.
   * Example: asciiBrailleToUnicode('abcd') -> '⠁⠃⠉⠙'
   */
  public asciiBrailleToUnicode(input: string): string {
    return input
      .split('')
      .map((char) => {
        const dotPattern = ASCII_BRAILLE_MAP[char];
        if (dotPattern === undefined) return char;
        return String.fromCharCode(BRAILLE_UNICODE_START + dotPattern);
      })
      .join('');
  }

  /**
   * Translates Unicode Braille to Text.
   * Supports Korean, English, Numbers, and Symbols.
   */
  public translateToText(input: string): string {
    const dots = input.split('').map((char) => {
      const code = char.charCodeAt(0);
      if (code >= BRAILLE_UNICODE_START && code <= BRAILLE_UNICODE_START + 0x3f) {
        return code - BRAILLE_UNICODE_START;
      }
      if (char === '\n') return 255;
      return -1; // Not a braille character
    });

    let result = '';
    let i = 0;
    let isEnglishMode = false;
    let isNumberMode = false;

    while (i < dots.length) {
      const dot = dots[i];

      if (dot === -1) {
        result += input[i];
        isNumberMode = false;
        i++;
        continue;
      }

      if (dot === 255) {
        result += '\n';
        isNumberMode = false;
        i++;
        continue;
      }

      // Indicators
      if (dot === NUMBER_INDICATOR) {
        isNumberMode = true;
        i++;
        continue;
      }

      if (dot === ENGLISH_INDICATOR) {
        isEnglishMode = true;
        i++;
        continue;
      }

      if (dot === ENGLISH_TERMINATOR && isEnglishMode) {
        isEnglishMode = false;
        i++;
        continue;
      }

      if (dot === 0) {
        // Space
        result += ' ';
        isNumberMode = false;
        i++;
        continue;
      }

      // Number Mode
      if (isNumberMode) {
        if (NUMBERS[dot]) {
          result += NUMBERS[dot];
          i++;
          continue;
        } else if (dot === 2) { // Comma in number mode
          result += ',';
          i++;
          continue;
        } else if (dot === 50) { // Dot in number mode
          result += '.';
          i++;
          continue;
        } else {
          isNumberMode = false;
          // Fall through
        }
      }

      // English Mode
      if (isEnglishMode) {
        let isUpper = false;
        if (dot === UPPERCASE_INDICATOR) {
          isUpper = true;
          i++;
          // Check for double uppercase (word)
          if (i < dots.length && dots[i] === UPPERCASE_INDICATOR) {
            i++;
            // Word uppercase
            while (i < dots.length && dots[i] !== 0 && dots[i] !== ENGLISH_TERMINATOR) {
              const d = dots[i];
              const char = ENGLISH_ALPHABET[d];
              if (char) {
                result += char.toUpperCase();
              } else {
                // Try symbols in English mode
                const sym = this.matchSymbol(dots, i);
                if (sym) {
                  result += sym.text;
                  i += sym.len - 1;
                }
              }
              i++;
            }
            continue;
          }
        }
        const charDot = isUpper ? dots[i] : dot;
        const char = ENGLISH_ALPHABET[charDot];
        if (char) {
          result += isUpper ? char.toUpperCase() : char;
          i++;
          continue;
        }
      }

      // Symbols (Check multi-dot symbols first)
      const sym = this.matchSymbol(dots, i);
      if (sym) {
        result += sym.text;
        i += sym.len;
        continue;
      }

      // Korean Mode
      // 1. Shortcuts (Check multi-dot shortcuts first)
      // But check if this could be a choseong followed by another shortcut
      const shortcut = this.matchShortcut(dots, i);
      if (shortcut) {
        // Check if this is a single-char shortcut that could be choseong
        // and is followed by another shortcut (like 나 + 영 = 녕)
        const singleCharShortcuts = ['가', '나', '다', '마', '바', '사', '자', '카', '타', '파', '하'];
        if (shortcut.len === 1 && singleCharShortcuts.includes(shortcut.text)) {
          // Check if next is also a shortcut
          if (i + 1 < dots.length) {
            const nextShortcut = this.matchShortcut(dots, i + 1);
            if (nextShortcut) {
              // This should be interpreted as choseong instead
              if (KOREAN_CHOSEONG[dot]) {
                result += KOREAN_CHOSEONG[dot];
                i++;
                continue;
              }
            }
          }
        }
        result += shortcut.text;
        i += shortcut.len;
        continue;
      }

      // 2. Choseong
      if (KOREAN_CHOSEONG[dot]) {
        result += KOREAN_CHOSEONG[dot];
        i++;
        continue;
      }

      // 3. Jungseong (Check multi-dot jungseong first)
      const jung = this.matchJungseong(dots, i);
      if (jung) {
        result += jung.text;
        i += jung.len;
        continue;
      }

      // 4. Jongseong
      if (KOREAN_JONGSEONG[dot]) {
        result += KOREAN_JONGSEONG[dot];
        i++;
        continue;
      }

      // 5. Korean Part/Consonant Indicators
      if (dot === KOREAN_PART_INDICATOR || dot === KOREAN_CONSONANT_INDICATOR) {
        i++;
        if (i < dots.length) {
          const nextDot = dots[i];
          // Try to find in choseong or jongseong maps
          const char = KOREAN_CHOSEONG[nextDot] || KOREAN_JONGSEONG[nextDot] || KOREAN_JUNGSEONG[nextDot];
          if (char) {
            result += char;
            i++;
            continue;
          }
        }
        continue;
      }

      // Unknown pattern
      i++;
    }

    return this.composeKorean(result);
  }

  private matchJungseong(dots: number[], index: number): { text: string; len: number } | null {
    const firstDot = dots[index].toString();
    const candidates = this.jungseongMap.get(firstDot);
    if (!candidates) return null;

    // Try patterns from longest to shortest
    for (const candidate of candidates) {
      if (index + candidate.len <= dots.length) {
        // Build the key to match
        const key = dots.slice(index, index + candidate.len).join(',');
        const expectedKey = Object.keys(KOREAN_JUNGSEONG).find(k => k === key);
        if (expectedKey) {
          return candidate;
        }
      }
    }
    return null;
  }

  private matchShortcut(dots: number[], index: number): { text: string; len: number } | null {
    const firstDot = dots[index].toString();
    const candidates = this.shortcutMap.get(firstDot);
    if (!candidates) return null;

    // Try patterns from longest to shortest
    for (const candidate of candidates) {
      if (index + candidate.len <= dots.length) {
        const key = dots.slice(index, index + candidate.len).join(',');
        const expectedKey = Object.keys(KOREAN_SHORTCUTS).find(k => k === key);
        if (expectedKey) {
          return candidate;
        }
      }
    }
    return null;
  }

  private matchSymbol(dots: number[], index: number): { text: string; len: number } | null {
    const firstDot = dots[index].toString();
    const candidates = this.symbolMap.get(firstDot);
    if (!candidates) return null;

    // Try patterns from longest to shortest
    for (const candidate of candidates) {
      if (index + candidate.len <= dots.length) {
        const key = dots.slice(index, index + candidate.len).join(',');
        const expectedKey = Object.keys(SYMBOLS).find(k => k === key);
        if (expectedKey) {
          return candidate;
        }
      }
    }
    return null;
  }

  /**
   * Composes individual Korean parts into syllables.
   * This is a basic implementation.
   */
  private composeKorean(text: string): string {
    const CHOSEONG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
    const JUNGSEONG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
    const JONGSEONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

    const choMap: Record<string, number> = {};
    CHOSEONG.split('').forEach((c, i) => choMap[c] = i);
    const jungMap: Record<string, number> = {};
    JUNGSEONG.split('').forEach((c, i) => jungMap[c] = i);
    const jongMap: Record<string, number> = {};
    JONGSEONG.forEach((c, i) => jongMap[c] = i);

    // Shortcuts that are already complete syllables
    const completeSyllables = new Set([
      '가', '나', '다', '마', '바', '사', '자', '카', '타', '파', '하',
      '억', '언', '얼', '연', '열', '영', '옥', '온', '옹', '운', '울', '은', '을', '인',
      '성', '정', '청', '것'
    ]);

    // Decompose complete syllables when preceded by choseong
    const decomposeSyllable = (syllable: string): [string, string, string] | null => {
      const code = syllable.charCodeAt(0);
      if (code >= 0xAC00 && code <= 0xD7A3) {
        const offset = code - 0xAC00;
        const choIdx = Math.floor(offset / (21 * 28));
        const jungIdx = Math.floor((offset % (21 * 28)) / 28);
        const jongIdx = offset % 28;
        return [CHOSEONG[choIdx], JUNGSEONG[jungIdx], JONGSEONG[jongIdx]];
      }
      return null;
    };

    let result = '';
    let i = 0;
    while (i < text.length) {
      const c = text[i];
      
      // Check if it's a choseong followed by a complete syllable
      if (choMap[c] !== undefined && i + 1 < text.length) {
        const nextChar = text[i + 1];
        const decomposed = decomposeSyllable(nextChar);
        if (decomposed) {
          const [nextCho, nextJung, nextJong] = decomposed;
          // If the next syllable starts with ㅇ, we can replace it with current choseong
          if (nextCho === 'ㅇ') {
            const choIdx = choMap[c];
            const jungIdx = jungMap[nextJung];
            const jongIdx = jongMap[nextJong] || 0;
            result += String.fromCharCode(0xAC00 + (choIdx * 21 + jungIdx) * 28 + jongIdx);
            i += 2;
            continue;
          }
        }
      }
      
      // If it's already a complete syllable (shortcut), keep it as is
      if (completeSyllables.has(c)) {
        result += c;
        i++;
        continue;
      }

      // Check if it's a jungseong (vowel) - needs implicit ㅇ choseong
      if (jungMap[c] !== undefined) {
        const jung = c;
        let jong = '';
        
        // Look ahead for jongseong
        if (i + 1 < text.length && jongMap[text[i + 1]] !== undefined && text[i + 1] !== '') {
          // Check if next is really jongseong (not followed by jungseong)
          if (i + 2 >= text.length || jungMap[text[i + 2]] === undefined) {
            jong = text[i + 1];
            i++;
          }
        }
        
        // Compose with implicit ㅇ
        const choIdx = choMap['ㅇ'];
        const jungIdx = jungMap[jung];
        const jongIdx = jongMap[jong] || 0;
        result += String.fromCharCode(0xAC00 + (choIdx * 21 + jungIdx) * 28 + jongIdx);
        i++;
        continue;
      }
      
      // Check if it's a choseong
      if (choMap[c] !== undefined) {
        const cho = c;
        let jung = '';
        let jong = '';

        // Look ahead for jungseong
        if (i + 1 < text.length && jungMap[text[i + 1]] !== undefined) {
          jung = text[i + 1];
          i++;
          
          // Look ahead for jongseong
          if (i + 1 < text.length && jongMap[text[i + 1]] !== undefined && text[i + 1] !== '') {
            // Check if next is really jongseong (not followed by jungseong)
            if (i + 2 >= text.length || jungMap[text[i + 2]] === undefined) {
              jong = text[i + 1];
              i++;
            }
          }
        }

        if (jung) {
          const choIdx = choMap[cho];
          const jungIdx = jungMap[jung];
          const jongIdx = jongMap[jong] || 0;
          result += String.fromCharCode(0xAC00 + (choIdx * 21 + jungIdx) * 28 + jongIdx);
        } else {
          // Choseong without jungseong, keep as is
          result += c;
        }
        i++;
        continue;
      }

      // Check if it's a jongseong alone (shouldn't happen normally, but handle it)
      if (jongMap[c] !== undefined && c !== '') {
        result += c;
        i++;
        continue;
      }

      // Not a Korean jamo, keep as is
      result += c;
      i++;
    }
    return result;
  }
}
