import { describe, it, expect } from 'vitest';
import { Decoder } from './index';

describe('Decoder', () => {
  const decoder = new Decoder();

  describe('asciiBrailleToUnicode', () => {
    it('should convert basic letters', () => {
      expect(decoder.asciiBrailleToUnicode('abcd')).toBe('⠁⠃⠉⠙');
    });

    it('should convert numbers (in ASCII Braille format)', () => {
      // In Braille ASCII, '1' is ⠂, '2' is ⠆, etc.
      expect(decoder.asciiBrailleToUnicode('1234')).toBe('⠂⠆⠒⠲');
    });

    it('should convert complex strings', () => {
      expect(decoder.asciiBrailleToUnicode('<3c]j,n+')).toBe('⠣⠒⠉⠻⠚⠠⠝⠬');
    });

    it('ascii', () => {
      // https://en.wikipedia.org/wiki/Braille_ASCII
      expect(decoder.asciiBrailleToUnicode(' ')).toBe('⠀')
      expect(decoder.asciiBrailleToUnicode('=')).toBe('⠿')
    });


    it('should convert complex korean strings 1', () => {
      expect(decoder.asciiBrailleToUnicode(',ui{a@{5ra.{7e}8\'#bjbd c* @mr,x,0')).toBe('⠠⠥⠊⠪⠁⠈⠪⠢⠗⠁⠨⠪⠶⠑⠻⠦⠄⠼⠃⠚⠃⠙⠀⠉⠡⠀⠈⠍⠗⠠⠭⠠⠴');
    });
  });

  describe('translateToText', () => {
    it('should translate Korean "안녕하세요"', () => {
      // 안: ⠣⠒ (ㅏ + ㄴ받침) -> Actually '안' is ⠣(ㅏ) + ⠒(ㄴ종성)
      // 녕: ⠉⠻ (ㄴ초성 + 영약자)
      // 하: ⠚ (하약자)
      // 세: ⠠⠝ (ㅅ초성 + ㅔ)
      // 요: ⠬ (ㅛ)
      // Result: ⠣⠒⠉⠻⠚⠠⠝⠬
      expect(decoder.translateToText('⠣⠒⠉⠻⠚⠠⠝⠬')).toBe('안녕하세요');
      // Note: Full syllable composition is complex, for now we verify parts
    });

    it('should translate English with indicators', () => {
      // ⠴ (English Indicator) + ⠁⠃⠉ (abc)
      expect(decoder.translateToText('⠴⠁⠃⠉')).toBe('abc');
    });

    it('should translate Numbers with indicators', () => {
      // ⠼ (Number Indicator) + ⠁⠃⠉ (123)
      expect(decoder.translateToText('⠼⠁⠃⠉')).toBe('123');
    });

    it('should handle mixed content', () => {
      // ⠼⠁⠀⠴⠁ (1 a)
      expect(decoder.translateToText('⠼⠁⠀⠴⠁')).toBe('1 a');
    });

    it('should translate Korean sample 1', () => {
      expect(decoder.translateToText('⠦⠄⠼⠃⠚⠃⠙⠀⠉⠡⠀⠈⠍⠗⠠⠭⠠⠴')).toBe('(2024년 귀속)');
      expect(decoder.translateToText('⠘⠂⠈⠪⠃⠘⠾⠚⠥⠐⠂')).toBe('발급번호:');
    });

    it('should translate Korean sample 2', () => {
      expect(decoder.translateToText('⠠⠥⠊⠪⠁⠈⠪⠢⠗⠁⠨⠪⠶⠑⠻⠦⠄⠼⠃⠚⠃⠙⠀⠉⠡⠀⠈⠍⠗⠠⠭⠠⠴')).toBe('소득금액증명(2024년 귀속)');
    });
  });
});
