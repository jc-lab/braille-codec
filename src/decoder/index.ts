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
  private jungseongMap: Map<string, { text: string; len: number; key: string }[]> = new Map();
  private shortcutMap: Map<string, { text: string; len: number; key: string }[]> = new Map();
  private symbolMap: Map<string, { text: string; len: number; key: string }[]> = new Map();

  // Korean composition maps
  private readonly CHOSEONG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  private readonly JUNGSEONG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  private readonly JONGSEONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  
  private choMap: Record<string, number> = {};
  private jungMap: Record<string, number> = {};
  private jongMap: Record<string, number> = {};

  constructor() {
    this.initializeLookupTables();
    this.CHOSEONG.split('').forEach((c, i) => this.choMap[c] = i);
    this.JUNGSEONG.split('').forEach((c, i) => this.jungMap[c] = i);
    this.JONGSEONG.forEach((c, i) => this.jongMap[c] = i);
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
      this.jungseongMap.get(firstDot)!.push({ text, len: dots.length, key });
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
      this.shortcutMap.get(firstDot)!.push({ text, len: dots.length, key });
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
      this.symbolMap.get(firstDot)!.push({ text, len: dots.length, key });
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
    return input.split('\n').map(v => this.translateToTextOneLine(v)).join('\n');
  }

  /**
   * Compose Korean syllable from jamo
   */
  private composeKoreanSyllable(cho: string, jung: string, jong: string = ''): string {
    const choIdx = this.choMap[cho];
    const jungIdx = this.jungMap[jung];
    const jongIdx = this.jongMap[jong] || 0;
    if (choIdx !== undefined && jungIdx !== undefined) {
      return String.fromCharCode(0xAC00 + (choIdx * 21 + jungIdx) * 28 + jongIdx);
    }
    return cho + jung + jong;
  }

  /**
   * Decompose Korean syllable to jamo
   */
  private decomposeSyllable(syllable: string): [string, string, string] | null {
    const code = syllable.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const offset = code - 0xAC00;
      const choIdx = Math.floor(offset / (21 * 28));
      const jungIdx = Math.floor((offset % (21 * 28)) / 28);
      const jongIdx = offset % 28;
      return [this.CHOSEONG[choIdx], this.JUNGSEONG[jungIdx], this.JONGSEONG[jongIdx]];
    }
    return null;
  }

  /**
   * Add jongseong to existing syllable
   */
  private addJongseongToSyllable(syllable: string, jong: string): string {
    const decomposed = this.decomposeSyllable(syllable);
    if (decomposed) {
      const [cho, jung, _] = decomposed;
      return this.composeKoreanSyllable(cho, jung, jong);
    }
    return syllable + jong;
  }

  /**
   * Translates Unicode Braille to Text (single line).
   * Supports Korean, English, Numbers, and Symbols.
   */
  public translateToTextOneLine(input: string): string {
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
    let pendingKoreanCho = ''; // Pending Korean choseong
    let pendingKoreanJung = ''; // Pending Korean jungseong

    const flushPendingKorean = () => {
      if (pendingKoreanCho && pendingKoreanJung) {
        result += this.composeKoreanSyllable(pendingKoreanCho, pendingKoreanJung);
        pendingKoreanCho = '';
        pendingKoreanJung = '';
      } else if (pendingKoreanCho) {
        result += pendingKoreanCho;
        pendingKoreanCho = '';
      } else if (pendingKoreanJung) {
        result += this.composeKoreanSyllable('ㅇ', pendingKoreanJung);
        pendingKoreanJung = '';
      }
    };

    while (i < dots.length) {
      const dot = dots[i];

      if (dot === -1) {
        flushPendingKorean();
        result += input[i];
        isNumberMode = false;
        i++;
        continue;
      }

      if (dot === 255) {
        flushPendingKorean();
        result += '\n';
        isNumberMode = false;
        i++;
        continue;
      }

      // Indicators
      if (dot === NUMBER_INDICATOR) {
        flushPendingKorean();
        isNumberMode = true;
        i++;
        continue;
      }

      if (dot === ENGLISH_INDICATOR) {
        flushPendingKorean();
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
        flushPendingKorean();
        // Check if we should skip space after number mode before Korean text (not English)
        if (isNumberMode && i + 1 < dots.length) {
          const nextDot = dots[i + 1];
          // Check if next is Korean (shortcut, choseong, jungseong, or jongseong)
          // But NOT English indicator
          const isNextKorean = (this.matchShortcut(dots, i + 1) !== null ||
                               KOREAN_CHOSEONG[nextDot] !== undefined ||
                               this.matchJungseong(dots, i + 1) !== null ||
                               KOREAN_JONGSEONG[nextDot] !== undefined) &&
                               nextDot !== ENGLISH_INDICATOR;
          if (isNextKorean) {
            // Skip space between number and Korean
            isNumberMode = false;
            i++;
            continue;
          }
        }
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
        } else if (dot === 36) { // Hyphen in number mode
          result += '‐'; // U+2010
          i++;
          continue;
        } else if (dot === KOREAN_CONSONANT_INDICATOR) {
          // ⠸ in number mode starts asterisk sequence
          i++;
          // All following ⠢ are asterisks
          while (i < dots.length && dots[i] === 34) { // ⠢
            result += '∗'; // U+2217
            i++;
          }
          continue;
        } else if (dot === 7) { // ⠇ in number mode (end marker?)
          // Skip or handle as needed
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
      // But check if this could be Korean choseong followed by jungseong or shortcut
      const sym = this.matchSymbol(dots, i);
      if (sym) {
        // Check if this dot is also a choseong and followed by jungseong or shortcut
        if (KOREAN_CHOSEONG[dot] && i + 1 < dots.length) {
          const nextJung = this.matchJungseong(dots, i + 1);
          const nextShortcut = this.matchShortcut(dots, i + 1);
          if (nextJung || nextShortcut) {
            // This is choseong, not symbol
            flushPendingKorean();
            pendingKoreanCho = KOREAN_CHOSEONG[dot];
            i++;
            continue;
          }
        }
        flushPendingKorean();
        result += sym.text;
        i += sym.len;
        continue;
      }

      // Korean Mode
      // 1. Shortcuts (Check multi-dot shortcuts first)
      const shortcut = this.matchShortcut(dots, i);
      if (shortcut) {
        // Check if there's a pending choseong (e.g., ㅅ + 옥 = 속, ㄴ + 영 = 녕)
        if (pendingKoreanCho) {
          // Decompose shortcut and combine with pending choseong
          const decomposed = this.decomposeSyllable(shortcut.text);
          if (decomposed && decomposed[0] === 'ㅇ') {
            // Replace ㅇ with pending choseong
            result += this.composeKoreanSyllable(pendingKoreanCho, decomposed[1], decomposed[2]);
            pendingKoreanCho = '';
            pendingKoreanJung = '';
            i += shortcut.len;
            continue;
          }
        }
        
        // Check if this is a single-char shortcut that could be choseong
        const singleCharShortcuts = ['가', '나', '다', '마', '바', '사', '자', '카', '타', '파', '하'];
        if (shortcut.len === 1 && singleCharShortcuts.includes(shortcut.text)) {
          // Check if next is a shortcut or jungseong (NOT jongseong)
          if (i + 1 < dots.length) {
            const nextShortcut = this.matchShortcut(dots, i + 1);
            const nextJung = this.matchJungseong(dots, i + 1);
            
            // If followed by shortcut or jungseong, interpret as choseong
            if (nextShortcut || nextJung) {
              if (KOREAN_CHOSEONG[dot]) {
                flushPendingKorean();
                pendingKoreanCho = KOREAN_CHOSEONG[dot];
                i++;
                continue;
              }
            }
          }
        }
        
        // Shortcut is a complete syllable
        // Check if next is jongseong
        if (i + 1 < dots.length && KOREAN_JONGSEONG[dots[i + 1]]) {
          // Add jongseong to shortcut
          flushPendingKorean();
          result += this.addJongseongToSyllable(shortcut.text, KOREAN_JONGSEONG[dots[i + 1]]);
          i += shortcut.len + 1;
          continue;
        }
        
        flushPendingKorean();
        result += shortcut.text;
        i += shortcut.len;
        continue;
      }

      // 2. Choseong
      if (KOREAN_CHOSEONG[dot]) {
        flushPendingKorean();
        pendingKoreanCho = KOREAN_CHOSEONG[dot];
        i++;
        continue;
      }

      // 3. Jungseong
      const jung = this.matchJungseong(dots, i);
      if (jung) {
        if (pendingKoreanCho && !pendingKoreanJung) {
          // Choseong + Jungseong
          pendingKoreanJung = jung.text;
        } else if (pendingKoreanCho && pendingKoreanJung) {
          // Already have cho + jung, flush and start new syllable
          flushPendingKorean();
          pendingKoreanCho = 'ㅇ';
          pendingKoreanJung = jung.text;
        } else {
          // Jungseong alone (implicit ㅇ)
          flushPendingKorean();
          pendingKoreanCho = 'ㅇ';
          pendingKoreanJung = jung.text;
        }
        i += jung.len;
        continue;
      }

      // 4. Jongseong
      if (KOREAN_JONGSEONG[dot]) {
        if (pendingKoreanCho && pendingKoreanJung) {
          // Complete syllable with jongseong
          result += this.composeKoreanSyllable(pendingKoreanCho, pendingKoreanJung, KOREAN_JONGSEONG[dot]);
          pendingKoreanCho = '';
          pendingKoreanJung = '';
        } else {
          // Jongseong without pending syllable
          flushPendingKorean();
          result += KOREAN_JONGSEONG[dot];
        }
        i++;
        continue;
      }

      // 5. Korean Part/Consonant Indicators
      if (dot === KOREAN_PART_INDICATOR || dot === KOREAN_CONSONANT_INDICATOR) {
        flushPendingKorean();
        i++;
        if (i < dots.length) {
          const nextDot = dots[i];
          // Try to find in choseong or jongseong maps
          const char = KOREAN_CHOSEONG[nextDot] || KOREAN_JONGSEONG[nextDot];
          if (char) {
            result += char;
            i++;
            continue;
          }
        }
        continue;
      }

      // Unknown pattern
      flushPendingKorean();
      i++;
    }

    flushPendingKorean();
    return result;
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
        if (candidate.key === key) {
          return { text: candidate.text, len: candidate.len };
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
        if (candidate.key === key) {
          return { text: candidate.text, len: candidate.len };
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
        if (candidate.key === key) {
          return { text: candidate.text, len: candidate.len };
        }
      }
    }
    return null;
  }
}
