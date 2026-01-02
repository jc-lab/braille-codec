import { decodeUnicode } from './utils';

export const KOREAN_CHOSEONG: Record<number, string> = {
  [decodeUnicode('⠈')]: 'ㄱ',
  [decodeUnicode('⠉')]: 'ㄴ',
  [decodeUnicode('⠊')]: 'ㄷ',
  [decodeUnicode('⠐')]: 'ㄹ',
  [decodeUnicode('⠑')]: 'ㅁ',
  [decodeUnicode('⠘')]: 'ㅂ',
  [decodeUnicode('⠠')]: 'ㅅ',
  // [decodeUnicode('')]: 'ㅇ', // skip ㅇ of choseong
  [decodeUnicode('⠨')]: 'ㅈ',
  [decodeUnicode('⠰')]: 'ㅊ',
  [decodeUnicode('⠋')]: 'ㅋ',
  [decodeUnicode('⠓')]: 'ㅌ',
  [decodeUnicode('⠙')]: 'ㅍ',
  [decodeUnicode('⠚')]: 'ㅎ',
};
